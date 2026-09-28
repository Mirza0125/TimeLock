#!/usr/bin/env bash
# scripts/verify-clean-checkout.sh
#
# Proves FND-01 literally: clones HEAD into a fresh temp directory, then
# builds and launches ScreenLimiter on the emulator using only the documented
# commands (docs/DEVELOPMENT.md), from a checkout with no node_modules/ and no
# android/. Prints CLEAN_CHECKOUT_OK on success.
#
# Expect a long run: this is a full native build (Gradle/pnpm caches on this
# machine are reused, but the clone itself has nothing pre-built). A
# cold-cache build on a different machine is not covered here — see the
# "Clean checkout scope" flagged assumption in 01-08-PLAN.md.
#
# Usage: `bash scripts/verify-clean-checkout.sh` (optionally `KEEP_CLONE=1` to
# keep the cloned checkout around for inspection afterward).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
. scripts/env.sh
set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"

DIRTY="$(git status --porcelain --untracked-files=no || true)"
if [ -n "$DIRTY" ]; then
  echo "WARNING: uncommitted changes are not part of the clone (git clone only sees HEAD):" >&2
  echo "$DIRTY" >&2
fi

CLONE_ROOT="$(mktemp -d)"
CLONE="${CLONE_ROOT}/screenlimiter-clean"

# Metro is started detached (setsid nohup) inside the clone subshell below, so
# if ANY later step fails, `set -e` aborts the subshell before it reaches its
# own "stop clone's Metro" line - leaving an orphaned Metro process bound to
# port 8081 that keeps serving the (about-to-be-deleted) clone path to every
# later request. `metro.sh stop`'s PID file is a single global path
# (${TMPDIR:-/tmp}/screenlimiter-metro.pid), not scoped per checkout, so it
# reliably targets whichever Metro this script most recently started,
# regardless of which step failed. Stopping it unconditionally in the EXIT
# trap - BEFORE removing the clone directory - is what prevents that orphan
# from corrupting every subsequent run with a stale ConfigError.
cleanup() {
  bash scripts/metro.sh stop >/dev/null 2>&1 || true
  if [ "${KEEP_CLONE:-0}" != "1" ]; then
    rm -rf "$CLONE_ROOT"
  else
    echo "KEEP_CLONE=1 set, leaving clone at: $CLONE" >&2
  fi
}
trap cleanup EXIT

echo "==> git clone --no-local $REPO $CLONE"
git clone --quiet --no-local "$REPO" "$CLONE"

if [ -d "${CLONE}/node_modules" ]; then
  echo "FATAL: cloned checkout already has node_modules/ - not a clean checkout" >&2
  exit 1
fi
if [ -d "${CLONE}/android" ]; then
  echo "FATAL: cloned checkout already has android/ - not a clean checkout" >&2
  exit 1
fi

echo "==> stopping this checkout's Metro to free port 8081"
bash scripts/metro.sh stop || true

(
  cd "$CLONE"
  . scripts/env.sh
  set -euo pipefail

  echo "==> (clone) corepack enable"
  corepack enable

  echo "==> (clone) pnpm install --frozen-lockfile"
  pnpm install --frozen-lockfile

  echo "==> (clone) bash scripts/run-android.sh --clean"
  bash scripts/run-android.sh --clean

  echo "==> (clone) waiting for Home route text 'Block strategy:'"
  # 600s, not the 120s a warm machine would need: this is the FIRST Metro
  # bundle build against a cold cache (fresh node_modules, no prior transform
  # cache), and it competes for CPU with this machine's Gradle/Kotlin daemons
  # and IDE processes left running from earlier plans in this session. A
  # 120s and then a 300s budget were both observed to time out here even
  # though the underlying native build had already succeeded (the app was
  # installed and running) - only the first JS bundle transform needed more
  # wall-clock time under this machine's load.
  node scripts/emu-ui.mjs wait "text:Block strategy:" 600000

  echo "==> (clone) stopping clone's Metro"
  bash scripts/metro.sh stop || true
)

echo "CLEAN_CHECKOUT_OK"
