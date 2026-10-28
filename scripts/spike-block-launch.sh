#!/usr/bin/env bash
# scripts/spike-block-launch.sh [--trials N]
#
# FND-03 block-launch spike: exercises both the activity-first cascade and
# the forced home+notification fallback N times each (default 5) on the
# API 36 emulator, with controls for known background-launch exemptions
# (recent visibility grace, overlay permission absence, notification-tap
# exemption not counted as activity-path evidence). Writes logcat +
# screenshot evidence and a machine-readable summary.json into
# .planning/phases/01-foundation-block-launch-spike/spike-evidence/.
#
# Repeatable: re-run this on every new Android release (Phase 12
# re-validation, see 01-RESEARCH.md Pitfall 3 / PITFALLS.md Pitfall 8).
#
# Exit codes: 0 when the run completed (whichever path won). Non-zero only
# for harness or guaranteed-path failures - see the exit-code table in
# 01-07-PLAN.md Task 1.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
. scripts/env.sh
set -euo pipefail

TRIALS=5
while [ $# -gt 0 ]; do
  case "$1" in
    --trials)
      TRIALS="${2:-}"
      shift 2
      ;;
    *)
      echo "Usage: $0 [--trials N]" >&2
      exit 2
      ;;
  esac
done
case "$TRIALS" in
  ''|*[!0-9]*)
    echo "Usage: $0 [--trials N] (N must be a positive integer)" >&2
    exit 2
    ;;
esac

PACKAGE="com.screenlimiter.app"
TARGET="com.google.android.deskclock/com.android.deskclock.DeskClock"
BLOCK_ACTIVITY_SUFFIX="expo.modules.screenguard.BlockActivity"
EVID=".planning/phases/01-foundation-block-launch-spike/spike-evidence"
GRACE_S=12
# BAL/StrictMode detection pattern (01-RESEARCH.md Pattern 3): background
# activity launch/start being blocked, "Abort background", "BAL", or any
# StrictMode line (the Android 16 detectBlockedBackgroundActivityLaunch()
# signal is surfaced via logcat as a StrictMode violation).
BAL_STRICT_PATTERN='background.*activit.*(launch|start)|abort background|\bbal\b|strictmode'
# Known-good from 01-04-SUMMARY.md ("confirmed to compile against compileSdk
# 36 via javap") - overridable for a future re-run where this may differ.
STRICT_MODE_DETECTOR_COMPILED="${STRICT_MODE_DETECTOR_COMPILED:-true}"

mkdir -p "$EVID"
rm -f "$EVID/summary.json" "$EVID/logcat-activity-first.txt" "$EVID/logcat-home-notification.txt" \
  "$EVID/activity-first-trial1.png" "$EVID/home-notification-shade.png" "$EVID/home-notification-tap.png"

fail() {
  echo "SPIKE_FAILED: $1" >&2
  exit 1
}

adbs() {
  adb -s "$ANDROID_SERIAL" "$@"
}

get_top_resumed() {
  adbs shell dumpsys activity activities 2>/dev/null \
    | grep -m1 "ResumedActivity:" \
    | sed -E 's/.*ActivityRecord\{[^ ]+ u[0-9]+ ([^ ]+).*/\1/' \
    | tr -d '\r'
}

# =====================================================================
# Preconditions - each fails fast with a clear message.
# =====================================================================

echo "==> precondition: adb get-state / SDK level"
STATE=$(adbs get-state 2>/dev/null | tr -d '\r') || STATE=""
[ "$STATE" = "device" ] || fail "adb get-state is '$STATE', expected 'device'"
SDK=$(adbs shell getprop ro.build.version.sdk | tr -d '\r')
[ "$SDK" = "36" ] || fail "SDK is $SDK, expected 36"

echo "==> precondition: com.screenlimiter.app is installed"
PM_PATH=$(adbs shell pm path "$PACKAGE" 2>/dev/null | tr -d '\r')
[ -n "$PM_PATH" ] || fail "pm path $PACKAGE is empty - is the app installed? run scripts/run-android.sh first"

echo "==> precondition: Clock (com.google.android.deskclock) is present"
CLOCK_LIST=$(adbs shell pm list packages com.google.android.deskclock | tr -d '\r')
[ -n "$CLOCK_LIST" ] || fail "com.google.android.deskclock not present on this emulator image"

echo "==> precondition: Metro is running"
bash scripts/metro.sh start

echo "==> precondition: overlay permission neither declared nor granted"
REQUESTED_PERMS=$(adbs shell dumpsys package "$PACKAGE" | sed -n '/requested permissions:/,/install permissions:/p')
OVERLAY_DECLARED=false
if echo "$REQUESTED_PERMS" | grep -q "SYSTEM_ALERT_WINDOW"; then
  OVERLAY_DECLARED=true
fi
OVERLAY_APPOP=$(adbs shell appops get com.screenlimiter.app SYSTEM_ALERT_WINDOW | tr -d '\r')
echo "appops get com.screenlimiter.app SYSTEM_ALERT_WINDOW -> $OVERLAY_APPOP"
if [ "$OVERLAY_DECLARED" = "true" ]; then
  fail "SYSTEM_ALERT_WINDOW is declared in the manifest - the run would be invalid"
fi
if echo "$OVERLAY_APPOP" | grep -qi ": allow"; then
  fail "SYSTEM_ALERT_WINDOW appop is allow - the run would be invalid"
fi

echo "==> precondition: waking device, dismissing keyguard, resolving launcher"
adbs shell input keyevent KEYCODE_WAKEUP
adbs shell wm dismiss-keyguard
LAUNCHER_RESOLVE=$(adbs shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME 2>/dev/null | tail -1 | tr -d '\r')
LAUNCHER_PKG="${LAUNCHER_RESOLVE%%/*}"
[ -n "$LAUNCHER_PKG" ] || fail "could not resolve the launcher package"
echo "Launcher package: $LAUNCHER_PKG"

BUILD_FINGERPRINT=$(adbs shell getprop ro.build.fingerprint | tr -d '\r')
MODEL=$(adbs shell getprop ro.product.model | tr -d '\r')
echo "Model: $MODEL / Fingerprint: $BUILD_FINGERPRINT"

echo "==> enabling the ScreenGuard accessibility service"
SERVICE_ENABLE_OUT=$(bash scripts/guard-service.sh enable) || fail "guard-service.sh enable failed"
echo "$SERVICE_ENABLE_OUT"
echo "$SERVICE_ENABLE_OUT" | grep -q "SERVICE_BOUND" || fail "guard-service.sh enable did not report SERVICE_BOUND"

# =====================================================================
# Helpers
# =====================================================================

set_strategy() {
  local wire="$1"
  adbs shell am start -n "${PACKAGE}/.MainActivity" >/dev/null 2>&1 || true
  node scripts/emu-ui.mjs tap "id:strategy-${wire}" 90000 || fail "could not tap strategy-${wire}"
  node scripts/emu-ui.mjs wait "text:Block strategy: ${wire}" 15000 || fail "UI did not confirm strategy ${wire}"
  adbs shell input keyevent KEYCODE_HOME
  sleep "$GRACE_S"
}

wait_top_resumed_prefix() {
  # Poll get_top_resumed for up to $2 seconds until it starts with $1.
  local prefix="$1"
  local timeout_s="${2:-10}"
  local waited=0
  while [ "$waited" -lt "$timeout_s" ]; do
    local top
    top=$(get_top_resumed)
    case "$top" in
      "$prefix"*) return 0 ;;
    esac
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

# =====================================================================
# Phase A: activityFirst, N trials
# =====================================================================

ACTIVITY_CONFIRMED=0
ACTIVITY_UNCONFIRMED=0
ACTIVITY_LAUNCH_ERROR=0
LATENCIES_CSV=""
ATTEMPTS_CSV=""
BAL_BLOCK_LOG_LINES=0
STRICT_MODE_LINES=0
CLOSE_TESTED=false
CLOSE_OK=true

echo "==> Phase A: activityFirst ($TRIALS trials)"
set_strategy activityFirst

for i in $(seq 1 "$TRIALS"); do
  adbs logcat -c
  adbs shell am start -W -n "$TARGET" >/dev/null 2>&1 || true
  sleep 3

  TOP=$(get_top_resumed)
  {
    echo "=== Trial $i (activityFirst) top=$TOP ==="
  } >> "$EVID/logcat-activity-first.txt"

  SG_LOG=$(adbs logcat -d -s ScreenGuard:I)
  echo "$SG_LOG" >> "$EVID/logcat-activity-first.txt"

  ALL_LOG=$(adbs logcat -d -b all)
  MATCHING_LOG=$(echo "$ALL_LOG" | grep -iE "$BAL_STRICT_PATTERN" || true)
  if [ -n "$MATCHING_LOG" ]; then
    echo "$MATCHING_LOG" >> "$EVID/logcat-activity-first.txt"
  fi

  OUTCOME_COUNT=$(echo "$SG_LOG" | grep -c "BLOCK_OUTCOME" || true)
  [ "$OUTCOME_COUNT" -eq 1 ] || fail "trial $i (activityFirst) produced $OUTCOME_COUNT BLOCK_OUTCOME lines, expected exactly 1"

  ATTEMPT_COUNT=$(echo "$SG_LOG" | grep -c "BLOCK_ATTEMPT" || true)
  ATTEMPTS_CSV="${ATTEMPTS_CSV}${ATTEMPTS_CSV:+,}${ATTEMPT_COUNT}"

  OUTCOME_LINE=$(echo "$SG_LOG" | grep "BLOCK_OUTCOME")
  REASON_VAL=$(echo "$OUTCOME_LINE" | sed -E 's/.*reason=([a-zA-Z]+).*/\1/')
  LATENCY_VAL=$(echo "$OUTCOME_LINE" | sed -E 's/.*latencyMs=(-|[0-9]+).*/\1/')

  BAL_LINES_THIS_TRIAL=$(echo "$MATCHING_LOG" | grep -iE "$BAL_STRICT_PATTERN" | grep -vi strictmode | grep -c "com.screenlimiter.app" || true)
  STRICT_LINES_THIS_TRIAL=$(echo "$MATCHING_LOG" | grep -ic "strictmode" || true)
  BAL_BLOCK_LOG_LINES=$((BAL_BLOCK_LOG_LINES + BAL_LINES_THIS_TRIAL))
  STRICT_MODE_LINES=$((STRICT_MODE_LINES + STRICT_LINES_THIS_TRIAL))

  case "$REASON_VAL" in
    confirmed)
      ACTIVITY_CONFIRMED=$((ACTIVITY_CONFIRMED + 1))
      LATENCIES_CSV="${LATENCIES_CSV}${LATENCIES_CSV:+,}${LATENCY_VAL}"
      ;;
    unconfirmed)
      ACTIVITY_UNCONFIRMED=$((ACTIVITY_UNCONFIRMED + 1))
      ;;
    launchError)
      ACTIVITY_LAUNCH_ERROR=$((ACTIVITY_LAUNCH_ERROR + 1))
      ;;
    *)
      fail "trial $i (activityFirst) BLOCK_OUTCOME had unexpected reason='$REASON_VAL'"
      ;;
  esac

  if [ "$i" = "1" ]; then
    adbs exec-out screencap -p > "$EVID/activity-first-trial1.png"
  fi

  # Leave the trial.
  case "$TOP" in
    *"$BLOCK_ACTIVITY_SUFFIX")
      CLOSE_TESTED=true
      if node scripts/emu-ui.mjs tap "text:Close app" 15000 \
        && wait_top_resumed_prefix "$LAUNCHER_PKG" 10; then
        : # close returned to launcher as expected
      else
        echo "WARN: trial $i Close app did not return to the launcher" >&2
        CLOSE_OK=false
        adbs shell input keyevent KEYCODE_HOME
      fi
      ;;
    *)
      adbs shell input keyevent KEYCODE_HOME
      ;;
  esac

  sleep "$GRACE_S"
done

if [ "$CLOSE_TESTED" = "true" ]; then
  CLOSE_RETURNS_TO_LAUNCHER="$CLOSE_OK"
else
  CLOSE_RETURNS_TO_LAUNCHER="null"
fi

# =====================================================================
# Phase B: homeNotification, N trials (the guaranteed path)
# =====================================================================

FORCED_OK_COUNT=0
HOME_REACHED_COUNT=0
NOTIF_POSTED_COUNT=0
NOTIF_TAP_OPENS_BLOCK="false"

echo "==> Phase B: homeNotification ($TRIALS trials)"
set_strategy homeNotification

for i in $(seq 1 "$TRIALS"); do
  adbs logcat -c
  adbs shell am start -W -n "$TARGET" >/dev/null 2>&1 || true
  sleep 3

  SG_LOG=$(adbs logcat -d -s ScreenGuard:I)
  {
    echo "=== Trial $i (homeNotification) ==="
    echo "$SG_LOG"
  } >> "$EVID/logcat-home-notification.txt"

  OUTCOME_COUNT=$(echo "$SG_LOG" | grep -c "BLOCK_OUTCOME" || true)
  [ "$OUTCOME_COUNT" -eq 1 ] || fail "trial $i (homeNotification) produced $OUTCOME_COUNT BLOCK_OUTCOME lines, expected exactly 1"

  TOP=$(get_top_resumed)
  NOTIF_LIST=$(adbs shell cmd notification list 2>/dev/null)

  FORCED_MATCH=$(echo "$SG_LOG" | grep -c "BLOCK_OUTCOME path=fallback reason=forced" || true)
  case "$TOP" in
    "$LAUNCHER_PKG"*) LAUNCHER_MATCH=1 ;;
    *) LAUNCHER_MATCH=0 ;;
  esac
  NOTIF_MATCH=$(echo "$NOTIF_LIST" | grep -c "com.screenlimiter.app|4201" || true)

  [ "$FORCED_MATCH" -ge 1 ] || fail "trial $i (homeNotification): BLOCK_OUTCOME path=fallback reason=forced not observed"
  [ "$LAUNCHER_MATCH" -eq 1 ] || fail "trial $i (homeNotification): launcher ($LAUNCHER_PKG) did not become top resumed (was $TOP)"
  [ "$NOTIF_MATCH" -ge 1 ] || fail "trial $i (homeNotification): notification com.screenlimiter.app|4201 was not posted"

  FORCED_OK_COUNT=$((FORCED_OK_COUNT + 1))
  HOME_REACHED_COUNT=$((HOME_REACHED_COUNT + 1))
  NOTIF_POSTED_COUNT=$((NOTIF_POSTED_COUNT + 1))

  if [ "$i" = "1" ]; then
    adbs shell cmd statusbar expand-notifications
    sleep 1
    adbs exec-out screencap -p > "$EVID/home-notification-shade.png"
    node scripts/emu-ui.mjs tap "text:is blocked" 15000 || fail "trial 1: could not tap the fallback notification"
    sleep 2
    TAP_TOP=$(get_top_resumed)
    case "$TAP_TOP" in
      *"$BLOCK_ACTIVITY_SUFFIX")
        NOTIF_TAP_OPENS_BLOCK="true"
        ;;
      *)
        fail "trial 1: tapping the notification did not open BlockActivity (top was $TAP_TOP)"
        ;;
    esac
    adbs exec-out screencap -p > "$EVID/home-notification-tap.png"
    node scripts/emu-ui.mjs tap "text:Close app" 15000 || true
    adbs shell cmd statusbar collapse
  fi

  sleep "$GRACE_S"
done

# =====================================================================
# Restore default strategy, write summary.json
# =====================================================================

echo "==> restoring strategy to activityFirst"
set_strategy activityFirst

echo "==> writing summary.json"
SL_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
SL_AVD="$EXPO_ANDROID_DEVICE" \
SL_MODEL="$MODEL" \
SL_SDK="$SDK" \
SL_FINGERPRINT="$BUILD_FINGERPRINT" \
SL_TRIALS="$TRIALS" \
SL_OVERLAY_DECLARED="$OVERLAY_DECLARED" \
SL_OVERLAY_APPOP="$OVERLAY_APPOP" \
SL_STRICT_COMPILED="$STRICT_MODE_DETECTOR_COMPILED" \
SL_A_CONFIRMED="$ACTIVITY_CONFIRMED" \
SL_A_UNCONFIRMED="$ACTIVITY_UNCONFIRMED" \
SL_A_LAUNCH_ERROR="$ACTIVITY_LAUNCH_ERROR" \
SL_A_LATENCIES_CSV="$LATENCIES_CSV" \
SL_A_ATTEMPTS_CSV="$ATTEMPTS_CSV" \
SL_A_BAL_LINES="$BAL_BLOCK_LOG_LINES" \
SL_A_STRICT_LINES="$STRICT_MODE_LINES" \
SL_A_CLOSE_RETURNS="$CLOSE_RETURNS_TO_LAUNCHER" \
SL_B_FORCED_OK="$FORCED_OK_COUNT" \
SL_B_HOME_REACHED="$HOME_REACHED_COUNT" \
SL_B_NOTIF_POSTED="$NOTIF_POSTED_COUNT" \
SL_B_TAP_OPENS_BLOCK="$NOTIF_TAP_OPENS_BLOCK" \
SL_OUT="$EVID/summary.json" \
node -e '
const fs = require("fs");
const env = process.env;
const toIntArray = (csv) => (csv ? csv.split(",").map((n) => parseInt(n, 10)) : []);
const latencies = toIntArray(env.SL_A_LATENCIES_CSV);
const attemptsPerTrial = toIntArray(env.SL_A_ATTEMPTS_CSV);
const sorted = [...latencies].sort((a, b) => a - b);
const maxLatencyMs = sorted.length ? sorted[sorted.length - 1] : null;
const medianLatencyMs = sorted.length
  ? (sorted.length % 2 === 1
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
  : null;
const closeReturnsToLauncher = env.SL_A_CLOSE_RETURNS === "null" ? null : env.SL_A_CLOSE_RETURNS === "true";

const summary = {
  date: env.SL_DATE,
  avd: env.SL_AVD,
  model: env.SL_MODEL,
  sdk: parseInt(env.SL_SDK, 10),
  buildFingerprint: env.SL_FINGERPRINT,
  trials: parseInt(env.SL_TRIALS, 10),
  overlayDeclared: env.SL_OVERLAY_DECLARED === "true",
  overlayAppOp: env.SL_OVERLAY_APPOP,
  strictModeDetectorCompiled: env.SL_STRICT_COMPILED === "true",
  activityFirst: {
    confirmed: parseInt(env.SL_A_CONFIRMED, 10),
    unconfirmed: parseInt(env.SL_A_UNCONFIRMED, 10),
    launchError: parseInt(env.SL_A_LAUNCH_ERROR, 10),
    latenciesMs: latencies,
    maxLatencyMs,
    medianLatencyMs,
    attemptsPerTrial,
    balBlockLogLines: parseInt(env.SL_A_BAL_LINES, 10),
    strictModeLines: parseInt(env.SL_A_STRICT_LINES, 10),
    closeReturnsToLauncher,
  },
  homeNotification: {
    forcedOk: parseInt(env.SL_B_FORCED_OK, 10),
    homeReachedLauncher: parseInt(env.SL_B_HOME_REACHED, 10),
    notificationPosted: parseInt(env.SL_B_NOTIF_POSTED, 10),
    notificationTapOpensBlock: env.SL_B_TAP_OPENS_BLOCK === "true",
  },
};

fs.writeFileSync(env.SL_OUT, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
'

echo ""
echo "=================================================================="
echo "SPIKE SUMMARY"
echo "=================================================================="
echo "SDK: $SDK   AVD: $EXPO_ANDROID_DEVICE   Model: $MODEL"
echo "activityFirst: confirmed=$ACTIVITY_CONFIRMED unconfirmed=$ACTIVITY_UNCONFIRMED launchError=$ACTIVITY_LAUNCH_ERROR balBlockLogLines=$BAL_BLOCK_LOG_LINES strictModeLines=$STRICT_MODE_LINES"
echo "homeNotification: forcedOk=$FORCED_OK_COUNT homeReachedLauncher=$HOME_REACHED_COUNT notificationPosted=$NOTIF_POSTED_COUNT notificationTapOpensBlock=$NOTIF_TAP_OPENS_BLOCK"
echo "=================================================================="
echo "SPIKE_DONE"
