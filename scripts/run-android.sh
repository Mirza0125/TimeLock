#!/usr/bin/env bash
# scripts/run-android.sh [--clean]
#
# Non-interactive prebuild + Metro + build/install/launch on the emulator.
# Run from the repo root. Pass --clean to force a clean `expo prebuild`.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
. scripts/env.sh
set -euo pipefail

BUILD_LOG="${TMPDIR:-/tmp}/screenlimiter-build.log"
CLEAN_FLAG=""
if [ "${1:-}" = "--clean" ]; then
  CLEAN_FLAG="--clean"
fi

echo "==> expo prebuild --platform android ${CLEAN_FLAG}"
EXPO_NO_GIT_STATUS=1 CI=1 npx expo prebuild --platform android --no-install $CLEAN_FLAG

echo "==> starting Metro"
bash scripts/metro.sh start

echo "==> adb reverse tcp:8081 tcp:8081"
adb -s "$ANDROID_SERIAL" reverse tcp:8081 tcp:8081

echo "==> clearing logcat"
adb -s "$ANDROID_SERIAL" logcat -c

run_build() {
  : > "$BUILD_LOG"
  if [ -n "${1:-}" ]; then
    CI=1 npx expo run:android --no-bundler --device "$1" >>"$BUILD_LOG" 2>&1
  else
    # expo run:android's --device flag expects an AVD/device NAME, not an adb
    # serial (e.g. "emulator-5554" is rejected with "Could not find device
    # with name"). When the AVD-name attempt fails, fall back to omitting
    # --device entirely so Expo auto-selects the sole connected device.
    CI=1 npx expo run:android --no-bundler >>"$BUILD_LOG" 2>&1
  fi
}

echo "==> expo run:android --device $EXPO_ANDROID_DEVICE"
if ! run_build "$EXPO_ANDROID_DEVICE"; then
  echo "Build with --device $EXPO_ANDROID_DEVICE failed, retrying without --device (auto-select the sole connected device)" >&2
  if ! run_build ""; then
    echo "Build failed. Last 60 lines of $BUILD_LOG:" >&2
    tail -n 60 "$BUILD_LOG" >&2
    exit 1
  fi
fi

echo "==> launching app"
# `am start` can exit non-zero even in the harmless case where the intent was
# delivered to an already-running top-most instance (e.g. `expo run:android`
# itself just launched the app via the dev-client deep link). Don't let that
# abort the script under `set -e` - the pidof loop below is the real check.
adb -s "$ANDROID_SERIAL" shell am start -n com.screenlimiter.app/.MainActivity >/dev/null 2>&1 || true

waited=0
pid=""
while [ "$waited" -lt 60 ]; do
  pid=$(adb -s "$ANDROID_SERIAL" shell pidof com.screenlimiter.app 2>/dev/null | tr -d '\r\n ')
  if [ -n "$pid" ]; then
    break
  fi
  sleep 1
  waited=$((waited + 1))
done

if [ -z "$pid" ]; then
  echo "App did not report a pid within 60s" >&2
  exit 1
fi

echo "APP_RUNNING pid=$pid"
