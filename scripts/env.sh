# scripts/env.sh
#
# Sourceable toolchain environment for ScreenLimiter. This file must be
# SOURCED, never executed directly, so it deliberately does NOT set
# `set -e`/`set -u` — doing so would poison the interactive/CI shell that
# sources it. Every script that needs `set -euo pipefail` enables it AFTER
# sourcing this file.
#
# Usage: `. scripts/env.sh` (or `source scripts/env.sh`) from the repo root.

# --- Node via nvm (SDK 57 / RN 0.86.3 requires Node ^24.3.0) ---
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # nvm.sh itself references unset variables internally; temporarily relax
  # nounset around it so this file stays safe to source under `set -u` too.
  _screenlimiter_had_nounset=0
  case "$-" in
    *u*) _screenlimiter_had_nounset=1; set +u ;;
  esac
  . "$NVM_DIR/nvm.sh"
  nvm use 24 >/dev/null 2>&1
  if [ "$_screenlimiter_had_nounset" = "1" ]; then
    set -u
  fi
  unset _screenlimiter_had_nounset
fi

# --- JDK 17 (AGP 8.12.0 minimum/default) ---
export JAVA_HOME="$HOME/.local/jdk/jdk-17"

# --- Android SDK ---
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

# --- Emulator / device targeting (overridable by the caller's environment) ---
export ANDROID_SERIAL="${ANDROID_SERIAL:-emulator-5554}"
export EXPO_ANDROID_DEVICE="${EXPO_ANDROID_DEVICE:-Medium_Phone_API_36.1}"

# --- CLI behavior ---
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export EXPO_NO_TELEMETRY=1

# --- PATH: prepend JDK, platform-tools, emulator, and pinned build-tools ---
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/build-tools/36.1.0:$PATH"
