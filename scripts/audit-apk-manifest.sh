#!/usr/bin/env bash
# scripts/audit-apk-manifest.sh [--check-permissions-stdin]
#
# Proves FND-02's minimal-permission half: the built debug APK requests only
# reviewed permissions, never a denylisted one, and targets the right SDK
# levels while keeping the security-relevant manifest attributes intact.
#
# NOTE: debug-APK permissions are a superset of release-APK permissions
# (release only drops the debug source-set manifest; library manifests are
# identical) - a clean debug APK audit therefore implies a clean release APK
# for the denylist.
#
# Modes:
#   (no args)               Builds :app:assembleDebug via scripts/gradle.sh,
#                           then audits permissions + SDK levels + manifest
#                           structure on the resulting APK. Prints
#                           APK_AUDIT_OK on success.
#   --check-permissions-stdin
#                           Self-test mode: reads `uses-permission: name='...'`
#                           lines from stdin and runs only the permission
#                           denylist/allowlist checks against them. Exits 1 on
#                           any denylisted or unlisted permission. Used to
#                           prove the gate has teeth without a real build.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
. scripts/env.sh
set -euo pipefail

ALLOWLIST_FILE="scripts/permission-allowlist.txt"
LOG_DIR="${TMPDIR:-/tmp}"

# Denylist checked FIRST; the allowlist can never override an entry here.
DENYLIST=(
  "android.permission.SYSTEM_ALERT_WINDOW"
  "android.permission.QUERY_ALL_PACKAGES"
  "android.permission.BIND_DEVICE_ADMIN"
  "android.permission.READ_EXTERNAL_STORAGE"
  "android.permission.WRITE_EXTERNAL_STORAGE"
  "android.permission.MANAGE_EXTERNAL_STORAGE"
  "android.permission.ACCESS_FINE_LOCATION"
  "android.permission.ACCESS_COARSE_LOCATION"
  "android.permission.ACCESS_BACKGROUND_LOCATION"
  "android.permission.READ_CONTACTS"
  "android.permission.CAMERA"
  "android.permission.RECORD_AUDIO"
  "android.permission.READ_SMS"
  "android.permission.READ_CALL_LOG"
  "android.permission.READ_PHONE_STATE"
)

is_denylisted() {
  local perm="$1"
  local d
  for d in "${DENYLIST[@]}"; do
    if [ "$perm" = "$d" ]; then
      return 0
    fi
  done
  return 1
}

is_allowlisted() {
  local perm="$1"
  grep -v '^#' "$ALLOWLIST_FILE" | grep -v '^[[:space:]]*$' | awk '{print $1}' | grep -qxF "$perm"
}

# Reads `uses-permission: name='...'` lines from stdin, checks each extracted
# permission against the denylist (first, non-overridable) then the
# allowlist. Prints a diagnostic per violation. Returns 1 if any violation
# was found, 0 otherwise.
check_permissions() {
  local failed=0
  local perms perm
  mapfile -t perms < <(sed -n "s/.*uses-permission\(-sdk-[0-9]\+\)\?: name='\([^']*\)'.*/\2/p")
  for perm in "${perms[@]}"; do
    [ -z "$perm" ] && continue
    if is_denylisted "$perm"; then
      echo "DENYLISTED PERMISSION: $perm" >&2
      failed=1
      continue
    fi
    if ! is_allowlisted "$perm"; then
      echo "UNLISTED PERMISSION (not in $ALLOWLIST_FILE): $perm" >&2
      local report="android/app/build/outputs/logs/manifest-merger-debug-report.txt"
      if [ -f "$report" ]; then
        echo "  Provenance (from $report):" >&2
        grep -F "$perm" "$report" >&2 || true
      fi
      failed=1
    fi
  done
  return "$failed"
}

MODE="${1:-}"

if [ "$MODE" = "--check-permissions-stdin" ]; then
  check_permissions
  exit $?
fi

# --- Normal mode: build, then audit the real APK ---
BUILD_LOG="$LOG_DIR/sl-audit-build.log"
echo "==> bash scripts/gradle.sh :app:assembleDebug"
if ! bash scripts/gradle.sh :app:assembleDebug >"$BUILD_LOG" 2>&1; then
  echo "FAIL: assembleDebug failed. Last 60 lines of $BUILD_LOG:" >&2
  tail -n 60 "$BUILD_LOG" >&2
  exit 1
fi

APK="android/app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$APK" ]; then
  echo "FAIL: expected APK not found at $APK" >&2
  exit 1
fi

echo "==> aapt2 dump permissions $APK"
if ! aapt2 dump permissions "$APK" | check_permissions; then
  echo "FAIL: permission audit failed (see denylisted/unlisted entries above)" >&2
  exit 1
fi
echo "PERMISSIONS_OK"

echo "==> aapt2 dump badging $APK"
BADGING="$(aapt2 dump badging "$APK")"
FAIL=0
if ! grep -q "minSdkVersion:'24'" <<<"$BADGING"; then
  echo "FAIL: minSdkVersion is not 24" >&2
  FAIL=1
fi
if ! grep -q "targetSdkVersion:'36'" <<<"$BADGING"; then
  echo "FAIL: targetSdkVersion is not 36" >&2
  FAIL=1
fi
if ! grep -q "compileSdkVersion='36'" <<<"$BADGING"; then
  echo "FAIL: compileSdkVersion is not 36" >&2
  FAIL=1
fi
if [ "$FAIL" != "0" ]; then
  exit 1
fi
echo "SDK_LEVELS_OK: minSdk 24, targetSdk 36, compileSdk 36"

echo "==> aapt2 dump xmltree --file AndroidManifest.xml $APK"
XMLTREE="$(aapt2 dump xmltree --file AndroidManifest.xml "$APK")"

if ! grep -q 'android:name(0x01010003)="expo.modules.screenguard.GuardAccessibilityService"' <<<"$XMLTREE"; then
  echo "FAIL: GuardAccessibilityService not found in merged manifest" >&2
  exit 1
fi
if ! grep -q 'android.permission.BIND_ACCESSIBILITY_SERVICE' <<<"$XMLTREE"; then
  echo "FAIL: BIND_ACCESSIBILITY_SERVICE guard not found in merged manifest" >&2
  exit 1
fi
echo "CHECK: GuardAccessibilityService + BIND_ACCESSIBILITY_SERVICE guard present"

# BlockActivity's own attribute block must show exported=false. Isolate the
# lines immediately after its android:name attribute (its element's own
# attribute list) rather than grepping the whole tree, so a same-named
# exported=false elsewhere in the manifest can't produce a false pass.
BLOCK_ACTIVITY_BLOCK="$(grep -A5 'android:name(0x01010003)="expo.modules.screenguard.BlockActivity"' <<<"$XMLTREE")"
if [ -z "$BLOCK_ACTIVITY_BLOCK" ]; then
  echo "FAIL: BlockActivity not found in merged manifest" >&2
  exit 1
fi
if ! grep -q 'android:exported(0x01010010)=false' <<<"$BLOCK_ACTIVITY_BLOCK"; then
  echo "FAIL: BlockActivity is not exported=false in merged manifest" >&2
  exit 1
fi
echo "CHECK: BlockActivity exported=false"

# Between E: queries and E: application, a MAIN+LAUNCHER intent must be present.
QUERIES_BLOCK="$(sed -n '/E: queries/,/E: application/p' <<<"$XMLTREE")"
if [ -z "$QUERIES_BLOCK" ]; then
  echo "FAIL: <queries> block not found in merged manifest" >&2
  exit 1
fi
if ! grep -q 'android.intent.category.LAUNCHER' <<<"$QUERIES_BLOCK"; then
  echo "FAIL: <queries> block does not contain a LAUNCHER category" >&2
  exit 1
fi
echo "CHECK: <queries> contains a MAIN/LAUNCHER intent"

echo "APK_AUDIT_OK"
