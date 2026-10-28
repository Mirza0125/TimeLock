#!/usr/bin/env bash
# scripts/gradle.sh <gradle args...>
#
# Env-sourcing gradlew wrapper: sources scripts/env.sh, prebuilds android/
# (non-clean, no install) if it is missing, then runs `./gradlew` inside
# android/ with the given arguments. Reused by scripts/audit-apk-manifest.sh
# and Plan 01-06 (JUnit).
#
# Usage: `bash scripts/gradle.sh :app:assembleDebug`
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
. scripts/env.sh
set -euo pipefail

if [ ! -d android ]; then
  echo "==> android/ missing, running expo prebuild --platform android"
  EXPO_NO_GIT_STATUS=1 CI=1 npx expo prebuild --platform android --no-install
fi

cd android
exec ./gradlew --console=plain "$@"
