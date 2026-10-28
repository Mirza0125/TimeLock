#!/usr/bin/env bash
# scripts/e2e-skeleton.sh
#
# Proves the walking-skeleton chain: UI tap -> Kotlin -> SharedPreferences ->
# survives force-stop -> re-read into the UI. Assumes the app is already
# installed on the emulator and Metro is running (run scripts/run-android.sh
# first).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
. scripts/env.sh
set -euo pipefail

PKG="com.screenlimiter.app"
ACTIVITY="$PKG/.MainActivity"

fail() {
  echo "E2E_SKELETON_FAILED: $1" >&2
  exit 1
}

echo "==> waking device and dismissing keyguard"
adb -s "$ANDROID_SERIAL" shell input keyevent KEYCODE_WAKEUP
adb -s "$ANDROID_SERIAL" shell wm dismiss-keyguard

echo "==> launching app"
# `am start` can exit non-zero even in the harmless case where the intent was
# delivered to an already-running top-most instance - don't let that abort
# the script under `set -e`.
adb -s "$ANDROID_SERIAL" shell am start -n "$ACTIVITY" >/dev/null 2>&1 || true

echo "==> waiting for Home to render"
node scripts/emu-ui.mjs wait id:block-strategy-value 90000 || fail "Home never rendered block-strategy-value"

echo "==> tapping strategy-homeNotification"
node scripts/emu-ui.mjs tap id:strategy-homeNotification 15000 || fail "could not tap strategy-homeNotification"

echo "==> waiting for UI to show homeNotification"
node scripts/emu-ui.mjs wait "text:Block strategy: homeNotification" 15000 || fail "UI did not update to homeNotification"

echo "==> asserting native persistence"
PREFS=$(adb -s "$ANDROID_SERIAL" shell run-as com.screenlimiter.app cat shared_prefs/screen_guard.xml 2>&1) || fail "could not read shared_prefs/screen_guard.xml"
echo "$PREFS" | grep -q homeNotification || fail "shared_prefs/screen_guard.xml does not contain homeNotification"

echo "==> force-stopping app"
adb -s "$ANDROID_SERIAL" shell am force-stop "$PKG"

echo "==> relaunching app"
adb -s "$ANDROID_SERIAL" shell am start -n "$ACTIVITY" >/dev/null 2>&1 || true

echo "==> waiting for persisted value to survive restart"
node scripts/emu-ui.mjs wait "text:Block strategy: homeNotification" 90000 || fail "persisted value did not survive force-stop + relaunch"

echo "==> restoring default (activityFirst)"
node scripts/emu-ui.mjs tap id:strategy-activityFirst 15000 || fail "could not tap strategy-activityFirst"
node scripts/emu-ui.mjs wait "text:Block strategy: activityFirst" 15000 || fail "UI did not restore to activityFirst"

echo "E2E_SKELETON_OK"
