#!/usr/bin/env bash
# scripts/metro.sh start|stop|status
#
# Background Metro bundler control. Assumes scripts/env.sh has already been
# sourced by the caller (run-android.sh does this).
set -euo pipefail

METRO_LOG="${TMPDIR:-/tmp}/screenlimiter-metro.log"
METRO_PID_FILE="${TMPDIR:-/tmp}/screenlimiter-metro.pid"
METRO_PORT=8081

is_running() {
  curl -fs "http://localhost:${METRO_PORT}/status" 2>/dev/null | grep -q "packager-status:running"
}

cmd_start() {
  if is_running; then
    echo "Metro already running on port ${METRO_PORT}"
    exit 0
  fi

  : > "$METRO_LOG"
  setsid nohup env CI=1 npx expo start --port "$METRO_PORT" --localhost >>"$METRO_LOG" 2>&1 &
  local pid=$!
  echo "$pid" > "$METRO_PID_FILE"

  local waited=0
  while [ "$waited" -lt 90 ]; do
    if is_running; then
      echo "Metro started (pid $pid), log: $METRO_LOG"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done

  echo "Metro failed to start within 90s. Log tail:" >&2
  tail -n 60 "$METRO_LOG" >&2 || true
  exit 1
}

cmd_stop() {
  if [ -f "$METRO_PID_FILE" ]; then
    local pid
    pid=$(cat "$METRO_PID_FILE")
    if [ -n "$pid" ]; then
      # Kill the whole process group started via setsid.
      kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    fi
    rm -f "$METRO_PID_FILE"
  fi
  echo "Metro stopped"
}

cmd_status() {
  if is_running; then
    echo "running"
    exit 0
  else
    echo "stopped"
    exit 1
  fi
}

case "${1:-}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 2
    ;;
esac
