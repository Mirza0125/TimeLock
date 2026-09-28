#!/usr/bin/env bash
# scripts/verify-native-config.sh
#
# Proves FND-02's reproducibility half: `expo prebuild --clean` is
# byte-reproducible across two consecutive clean runs, a third non-clean
# re-run over the existing tree is idempotent (never duplicates a manifest
# entry), and the generated config contains exactly the plugin's entries -
# once each, nothing more, nothing less. android/ is asserted gitignored and
# untracked throughout; this script never hand-edits it.
#
# Usage: `bash scripts/verify-native-config.sh` from the repo root.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
. scripts/env.sh
set -euo pipefail

LOG_DIR="${TMPDIR:-/tmp}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

# --- Structural: android/ must be gitignored and have zero tracked files ---
if ! git check-ignore -q android; then
  echo "FAIL: android/ is not gitignored" >&2
  exit 1
fi
TRACKED_ANDROID_FILES="$(git ls-files android)"
if [ -n "$TRACKED_ANDROID_FILES" ]; then
  echo "FAIL: android/ has tracked files (must be zero):" >&2
  echo "$TRACKED_ANDROID_FILES" >&2
  exit 1
fi
echo "STRUCTURAL_OK: android/ is gitignored with zero tracked files"

# --- Snapshot set, relative to android/ ---
SNAPSHOT_FILES=(
  "app/src/main/AndroidManifest.xml"
  "app/src/debug/AndroidManifest.xml"
  "app/src/debugOptimized/AndroidManifest.xml"
  "app/src/main/res/xml/screen_guard_accessibility_service.xml"
  "app/src/main/res/values/strings.xml"
  "app/build.gradle"
  "gradle.properties"
  "settings.gradle"
  "build.gradle"
)

# Copies the snapshot set from android/ into $1 (a run directory), preserving
# relative paths. Files the template doesn't produce (e.g. debugOptimized may
# not exist on every Expo/AGP version) are silently skipped.
snapshot() {
  local run_dir="$1"
  mkdir -p "$run_dir"
  for rel in "${SNAPSHOT_FILES[@]}"; do
    if [ -f "android/$rel" ]; then
      mkdir -p "$run_dir/$(dirname "$rel")"
      cp "android/$rel" "$run_dir/$rel"
    fi
  done
}

prebuild() {
  local extra_flag="${1:-}"
  local log_file="$2"
  # shellcheck disable=SC2086
  EXPO_NO_GIT_STATUS=1 CI=1 npx expo prebuild --platform android --no-install $extra_flag \
    >"$log_file" 2>&1
}

diff_or_fail() {
  local left="$1" right="$2" ok_marker="$3"
  if ! diff -r "$left" "$right" >"$WORKDIR/diff.txt" 2>&1; then
    echo "FAIL: $left and $right differ:" >&2
    cat "$WORKDIR/diff.txt" >&2
    exit 1
  fi
  echo "$ok_marker"
}

echo "==> Run A: expo prebuild --clean"
prebuild "--clean" "$LOG_DIR/sl-prebuild-a.log"
snapshot "$WORKDIR/run-a"

echo "==> Run B: expo prebuild --clean"
prebuild "--clean" "$LOG_DIR/sl-prebuild-b.log"
snapshot "$WORKDIR/run-b"

diff_or_fail "$WORKDIR/run-a" "$WORKDIR/run-b" "REPRO_CLEAN_OK"

echo "==> Run C: expo prebuild (non-clean, re-applies mods to the existing tree)"
prebuild "" "$LOG_DIR/sl-prebuild-c.log"
snapshot "$WORKDIR/run-c"

diff_or_fail "$WORKDIR/run-a" "$WORKDIR/run-c" "REPRO_IDEMPOTENT_OK"

# --- Exact-count assertions on run A (== run B == run C, already proven byte-identical) ---
MAIN_MANIFEST="$WORKDIR/run-a/app/src/main/AndroidManifest.xml"
SERVICE_XML="$WORKDIR/run-a/app/src/main/res/xml/screen_guard_accessibility_service.xml"

assert_count() {
  local description="$1" pattern="$2" expected="$3" file="$4"
  local actual
  actual="$(grep -c -- "$pattern" "$file" || true)"
  echo "CHECK: $description = $actual (expected $expected)"
  if [ "$actual" != "$expected" ]; then
    echo "FAIL: $description expected $expected, got $actual in $file" >&2
    exit 1
  fi
}

assert_min_count() {
  local description="$1" pattern="$2" min="$3" file="$4"
  local actual
  actual="$(grep -c -- "$pattern" "$file" || true)"
  echo "CHECK: $description = $actual (expected >= $min)"
  if [ "$actual" -lt "$min" ]; then
    echo "FAIL: $description expected >= $min, got $actual in $file" >&2
    exit 1
  fi
}

assert_count "GuardAccessibilityService entries" 'android:name="expo.modules.screenguard.GuardAccessibilityService"' 1 "$MAIN_MANIFEST"
assert_count "BlockActivity entries" 'android:name="expo.modules.screenguard.BlockActivity"' 1 "$MAIN_MANIFEST"
assert_min_count "BIND_ACCESSIBILITY_SERVICE references" 'android.permission.BIND_ACCESSIBILITY_SERVICE' 1 "$MAIN_MANIFEST"
assert_count "accessibility-service XML resource references" '@xml/screen_guard_accessibility_service' 1 "$MAIN_MANIFEST"
assert_count "LAUNCHER categories" 'android.intent.category.LAUNCHER' 2 "$MAIN_MANIFEST"

assert_count "canRetrieveWindowContent=false" 'canRetrieveWindowContent="false"' 1 "$SERVICE_XML"
assert_count "isAccessibilityTool=false" 'isAccessibilityTool="false"' 1 "$SERVICE_XML"
assert_count "typeWindowStateChanged|typeWindowsChanged event types" 'typeWindowStateChanged|typeWindowsChanged' 1 "$SERVICE_XML"

# Debug-family manifests: every SYSTEM_ALERT_WINDOW line must carry tools:node="remove"
for rel in "app/src/debug/AndroidManifest.xml" "app/src/debugOptimized/AndroidManifest.xml"; do
  candidate="$WORKDIR/run-a/$rel"
  if [ -f "$candidate" ]; then
    overlay_lines="$(grep -c 'android.permission.SYSTEM_ALERT_WINDOW' "$candidate" || true)"
    removed_lines="$(grep -c 'android.permission.SYSTEM_ALERT_WINDOW"[^/>]*tools:node="remove"' "$candidate" || true)"
    echo "CHECK: $rel SYSTEM_ALERT_WINDOW lines=$overlay_lines, tools:node=\"remove\" lines=$removed_lines"
    if [ "$overlay_lines" != "$removed_lines" ] || [ "$overlay_lines" = "0" ]; then
      echo "FAIL: $rel does not mark every SYSTEM_ALERT_WINDOW line tools:node=\"remove\"" >&2
      exit 1
    fi
  fi
done

echo "NATIVE_CONFIG_OK"
