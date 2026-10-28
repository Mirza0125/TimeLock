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
  # `grep -v` legitimately exits 1 when every line matched the exclusion (our
  # component was the only one listed) - that is not an error, so don't let
  # `set -o pipefail` abort the caller's assignment over an empty result.
  echo "$current" | tr ':' '\n' | grep -v "^${COMPONENT}$" | paste -sd ':' - || true
}

# `settings put secure enabled_accessibility_services ""` fails with "Bad
# arguments" (the value token disappears once adb joins/whitespace-collapses
# an empty final argument) - an empty target list must be a `delete`, not a
# `put` with an empty string.
write_enabled_services() {
  local value="$1"
  if [ -z "$value" ]; then
    adb -s "$ANDROID_SERIAL" shell settings delete secure enabled_accessibility_services >/dev/null
  else
    adb -s "$ANDROID_SERIAL" shell settings put secure enabled_accessibility_services "$value"
  fi
}

cmd_enable() {
  # The format string contains a space, so it must reach the remote shell as
  # a single quoted argument - adb shell joins multiple local args with
  # spaces before the remote shell ever sees them, which would otherwise
  # strip the quoting local bash already consumed and hand `date` extra,
  # unwanted arguments.
  local start_time
  start_time=$(adb -s "$ANDROID_SERIAL" shell "date +'%m-%d %H:%M:%S.000'" | tr -d '\r')

  # Remove then re-add: a single `settings put` with the same final value the
  # provider already holds does not reliably make AccessibilityManagerService
  # unbind/rebind (no observed value change to react to), so SERVICE_CONNECTED
  # would not fire on an already-enabled service. Writing the "without ours"
  # value first (even when empty) guarantees a real transition before the
  # final put re-adds it.
  local without_ours
  without_ours=$(remove_component)
  write_enabled_services "$without_ours"
  if [ -n "$without_ours" ]; then
    write_enabled_services "${without_ours}:${COMPONENT}"
  else
    write_enabled_services "${COMPONENT}"
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
  write_enabled_services "$without_ours"
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
