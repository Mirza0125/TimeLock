#!/usr/bin/env bash
# scripts/guard-service.sh enable|disable|status
#
# adb-based enable/disable/status control for the ScreenGuard accessibility
# service, for headless spike/E2E verification only.
#
# IMPORTANT: this bypasses Android 13+'s Restricted Settings block on
# sideloaded apps (that block only applies to enabling accessibility services
# through the Settings UI after a non-Play install). It is NOT the real user
# path - Phase 7 owns the actual onboarding/consent flow that walks a real
# user through Settings.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
. scripts/env.sh
set -euo pipefail

PACKAGE="com.screenlimiter.app"
COMPONENT="${PACKAGE}/expo.modules.screenguard.GuardAccessibilityService"

usage() {
  echo "Usage: $0 enable|disable|status" >&2
  exit 2
}

current_services() {
  adb -s "$ANDROID_SERIAL" shell settings get secure enabled_accessibility_services 2>/dev/null | tr -d '\r'
}

remove_component() {
  local current
  current=$(current_services)
  if [ "$current" = "null" ] || [ -z "$current" ]; then
    echo ""
    return 0
  fi
  echo "$current" | tr ':' '\n' | grep -v "^${COMPONENT}$" | paste -sd ':' -
}

cmd_enable() {
  # The format string contains a space, so it must reach the remote shell as
  # a single quoted argument - adb shell joins multiple local args with
  # spaces before the remote shell ever sees them, which would otherwise
  # strip the quoting local bash already consumed and hand `date` extra,
  # unwanted arguments.
  local start_time
  start_time=$(adb -s "$ANDROID_SERIAL" shell "date +'%m-%d %H:%M:%S.000'" | tr -d '\r')

  # Remove then re-add: forces a fresh bind even if the component was already
  # listed (e.g. from a prior test run), so SERVICE_CONNECTED reliably fires.
  local without_ours
  without_ours=$(remove_component)
  if [ -n "$without_ours" ]; then
    adb -s "$ANDROID_SERIAL" shell settings put secure enabled_accessibility_services "${without_ours}:${COMPONENT}"
  else
    adb -s "$ANDROID_SERIAL" shell settings put secure enabled_accessibility_services "${COMPONENT}"
  fi
  adb -s "$ANDROID_SERIAL" shell settings put secure accessibility_enabled 1
  adb -s "$ANDROID_SERIAL" shell pm grant "$PACKAGE" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true

  local waited=0
  while [ "$waited" -lt 20 ]; do
    if adb -s "$ANDROID_SERIAL" logcat -d -s ScreenGuard:I -T "$start_time" 2>/dev/null | grep -q 'SERVICE_CONNECTED'; then
      echo "SERVICE_BOUND"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done

  echo "Service did not report SERVICE_CONNECTED within 20s" >&2
  adb -s "$ANDROID_SERIAL" shell dumpsys accessibility 2>/dev/null | grep -i screenlimiter >&2 || true
  return 1
}

cmd_disable() {
  local without_ours
  without_ours=$(remove_component)
  adb -s "$ANDROID_SERIAL" shell settings put secure enabled_accessibility_services "${without_ours}"
  echo "SERVICE_DISABLED"
}

cmd_status() {
  local current
  current=$(current_services)
  if echo "$current" | tr ':' '\n' | grep -q "^${COMPONENT}$"; then
    echo "enabled"
  else
    echo "disabled"
  fi
}

case "${1:-}" in
  enable) cmd_enable ;;
  disable) cmd_disable ;;
  status) cmd_status ;;
  *) usage ;;
esac
