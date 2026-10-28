---
phase: 01-foundation-block-launch-spike
plan: 05
subsystem: android-native
tags: [expo-prebuild, config-plugin, aapt2, gradle, android-manifest, permission-audit]

# Dependency graph
requires:
  - phase: 01-04
    provides: plugins/withScreenGuardAndroid.js generating the GuardAccessibilityService, BlockActivity, MAIN/LAUNCHER <queries> entry, accessibility XML, and debug-manifest overlay-permission removal - this plan proves that output is reproducible and minimal
provides:
  - scripts/verify-native-config.sh proving `expo prebuild --clean` is byte-reproducible across two clean runs and idempotent across a third non-clean re-run, with exact-count assertions on every plugin-generated manifest/XML entry
  - scripts/audit-apk-manifest.sh proving the built debug APK requests only reviewed permissions (denylist checked first, unoverridable), targets minSdk 24/targetSdk 36/compileSdk 36, and keeps the service guard + BlockActivity exported=false + queries LAUNCHER intent in the merged manifest
  - scripts/permission-allowlist.txt - the reviewed, reasoned permission allowlist (INTERNET, POST_NOTIFICATIONS, VIBRATE, androidx.core's DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION)
  - scripts/gradle.sh - env-sourcing gradlew wrapper that prebuilds android/ when missing, reused by both audit-apk-manifest.sh and Plan 01-06's JUnit runs
  - pnpm verify:native / verify:native:config scripts
affects: [01-06 (JUnit tests reuse scripts/gradle.sh), 01-07 (BAL spike requires the overlay permission stay absent from the APK - now proven and gated)]

actuals:
  tokens: 3844
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Two-mode audit script (--check-permissions-stdin self-test vs. real-APK normal mode) so the gate's own correctness is proven without needing a fresh build every time it's exercised"
    - "Denylist-first, unoverridable permission check: the allowlist can add reviewed permissions but can never rescue a denylisted one"
    - "Byte-level diff (not just grep counts) across two clean prebuilds plus a third non-clean re-run, isolating 'reproducible' from 'idempotent' as two distinct, separately-provable claims"

key-files:
  created:
    - scripts/verify-native-config.sh
    - scripts/audit-apk-manifest.sh
    - scripts/permission-allowlist.txt
    - scripts/gradle.sh
  modified:
    - package.json

key-decisions:
  - "aapt2 dump badging reports the minimum SDK level as `minSdkVersion:'24'`, not `sdkVersion:'24'` as the plan's verify text assumed - the script checks the real field name (minSdkVersion); the plan's literal string doesn't occur in actual aapt2 output on this toolchain (build-tools 36.1.0)."
  - "com.screenlimiter.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION (added transitively by androidx.core 1.18.0 via androidx.emoji2, confirmed via android/app/build/outputs/logs/manifest-merger-debug-report.txt) is allowlisted as a self-scoped signature permission, not a real OS-granted permission - exactly the plan's anticipated 'benign library requirement' case."
  - "BlockActivity's exported=false check greps only the 5 lines immediately following its android:name attribute (its own element's attribute block), not the whole merged manifest, so a same-valued exported=false attribute elsewhere can't produce a false pass."

patterns-established:
  - "Every native-surface gate (verify-native-config.sh, audit-apk-manifest.sh) sources scripts/env.sh then re-enables `set -euo pipefail`, matching the pattern already established by run-android.sh and guard-service.sh."

requirements-completed: [FND-02]

coverage:
  - id: D1
    description: "Two consecutive `expo prebuild --clean` runs produce byte-identical native-config files (manifests, accessibility XML, gradle files); a third non-clean re-run is idempotent (no duplicated service/activity/queries entry)"
    requirement: "FND-02"
    verification:
      - kind: other
        ref: "bash scripts/verify-native-config.sh - printed REPRO_CLEAN_OK and REPRO_IDEMPOTENT_OK, diff -r across all three snapshot sets was empty, exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Generated manifest has exactly one GuardAccessibilityService, one BlockActivity, two LAUNCHER categories, and the accessibility XML has exactly the plugin's canRetrieveWindowContent/isAccessibilityTool/event-type values, once each"
    requirement: "FND-02"
    verification:
      - kind: other
        ref: "bash scripts/verify-native-config.sh exact-count assertions - all 8 checks printed their expected count, exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "The built debug APK requests no denylisted permission and every requested permission appears in scripts/permission-allowlist.txt with a reason"
    requirement: "FND-02"
    verification:
      - kind: other
        ref: "bash scripts/audit-apk-manifest.sh - PERMISSIONS_OK printed; `aapt2 dump permissions app-debug.apk` shows only INTERNET, POST_NOTIFICATIONS, VIBRATE, and androidx.core's self-scoped DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION, all allowlisted with reasons; no denylist match"
        status: pass
    human_judgment: false
  - id: D4
    description: "The debug APK badging shows minSdk 24, targetSdk 36, compileSdk 36"
    requirement: "FND-02"
    verification:
      - kind: other
        ref: "aapt2 dump badging app-debug.apk: minSdkVersion:'24', targetSdkVersion:'36', compileSdkVersion='36' - SDK_LEVELS_OK printed by scripts/audit-apk-manifest.sh"
        status: pass
    human_judgment: false
  - id: D5
    description: "The APK's merged manifest keeps the service's BIND_ACCESSIBILITY_SERVICE guard, BlockActivity exported=false, and a MAIN+LAUNCHER intent inside <queries>"
    requirement: "FND-02"
    verification:
      - kind: other
        ref: "aapt2 dump xmltree --file AndroidManifest.xml app-debug.apk, checked by scripts/audit-apk-manifest.sh - all three structure checks printed, exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "The permission checker fails when fed a denylisted permission or an unlisted one (the gate has teeth), and passes when fed only allowlisted permissions"
    requirement: "FND-02"
    verification:
      - kind: other
        ref: "printf ... | bash scripts/audit-apk-manifest.sh --check-permissions-stdin, run three times: SYSTEM_ALERT_WINDOW -> exit 1, NOT_IN_ALLOWLIST -> exit 1, INTERNET+POST_NOTIFICATIONS -> exit 0 - GATE_TEETH_OK"
        status: pass
    human_judgment: false
  - id: D7
    description: "android/ is gitignored and has zero tracked files, even after multiple prebuild/gradle-build cycles this plan ran"
    requirement: "FND-02"
    verification:
      - kind: other
        ref: "git check-ignore -q android (exit 0); git ls-files android (empty) - checked both inside verify-native-config.sh and independently after the full pnpm verify:native run"
        status: pass
    human_judgment: false

duration: 21min
completed: 2026-09-28
status: complete
---

# Phase 1 Plan 05: Native Config Reproducibility + APK Permission Audit Summary

**`pnpm verify:native` proves `expo prebuild --clean` is byte-reproducible and idempotent, and that the built debug APK requests only three reviewed app permissions plus one benign androidx.core self-permission - no overlay, no all-packages query, minSdk 24/targetSdk 36/compileSdk 36 confirmed via aapt2.**

## Performance

- **Duration:** ~21 min
- **Started:** 2026-09-28T13:01:14Z (previous plan's completion commit)
- **Completed:** 2026-09-28T13:22:16Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `scripts/verify-native-config.sh` runs `expo prebuild --clean` twice and diffs the resulting manifests/XML/gradle files byte-for-byte (`REPRO_CLEAN_OK`), then runs a third non-clean prebuild and diffs it against the first clean run to prove the plugin's remove-then-add mods are idempotent (`REPRO_IDEMPOTENT_OK`). It then asserts exact counts on the generated config: exactly one `GuardAccessibilityService`, one `BlockActivity`, two `LAUNCHER` categories, and the accessibility XML's `canRetrieveWindowContent="false"`/`isAccessibilityTool="false"`/event-type values appearing exactly once each, plus every `SYSTEM_ALERT_WINDOW` line in the debug/debugOptimized manifests carrying `tools:node="remove"`. Prints `NATIVE_CONFIG_OK`.
- `scripts/audit-apk-manifest.sh` builds `:app:assembleDebug` via the new `scripts/gradle.sh`, then runs `aapt2 dump permissions` through a denylist-first (unoverridable) then allowlist check, `aapt2 dump badging` for SDK levels, and `aapt2 dump xmltree` for the service guard / `BlockActivity` `exported=false` / `<queries>` LAUNCHER structure. Prints `APK_AUDIT_OK`. Its `--check-permissions-stdin` mode lets the same denylist/allowlist logic be self-tested without a real build.
- `scripts/permission-allowlist.txt` lists exactly four reviewed permissions with reasons: `INTERNET` (Metro dev loop; Firebase later), `POST_NOTIFICATIONS` (block fallback notification), `VIBRATE` (haptics), and `com.screenlimiter.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (androidx.core 1.18.0's self-scoped Android-13+ dynamic-receiver guard - confirmed via the manifest-merger provenance report, not a real OS permission).
- `scripts/gradle.sh` is a thin, reusable wrapper: source `env.sh`, prebuild `android/` if missing, run `./gradlew --console=plain "$@"` - reused as-is by `audit-apk-manifest.sh` and available for Plan 01-06's JUnit runs.
- `pnpm verify:native` (= `verify:native:config` + `audit-apk-manifest.sh`) was run end-to-end and exits 0, printing all four required markers plus the gate-teeth self-test's `GATE_TEETH_OK`.
- The real APK badging confirms `minSdkVersion:'24'`, `targetSdkVersion:'36'`, `compileSdkVersion='36'` - no `app.json`/`expo-build-properties` change was needed since these already matched.

## Task Commits

1. **Task 1: `prebuild --clean` is proven byte-reproducible and idempotent, and the generated config is exactly the plugin's** - `53ce38a` (feat)
2. **Task 2: The built APK requests only reviewed permissions and targets SDK 36 - audited by aapt2 with a self-tested gate** - `c661974` (feat)

**Plan metadata:** pending (this docs commit)

## Files Created/Modified

- `scripts/verify-native-config.sh` - three-run byte-diff (clean/clean/non-clean) plus exact-count structural assertions; prints `REPRO_CLEAN_OK`, `REPRO_IDEMPOTENT_OK`, `NATIVE_CONFIG_OK`
- `scripts/audit-apk-manifest.sh` - denylist-first/allowlist permission gate, SDK-level badging check, merged-manifest structure check; `--check-permissions-stdin` self-test mode; prints `APK_AUDIT_OK`
- `scripts/permission-allowlist.txt` - the reviewed, reasoned permission allowlist
- `scripts/gradle.sh` - env-sourcing gradlew wrapper, prebuilds `android/` when missing
- `package.json` - `verify:native:config` and `verify:native` scripts added

## Decisions Made

- Matched the audit script's SDK-level check to aapt2's actual field name (`minSdkVersion`), not the plan's `sdkVersion` shorthand - see `key-decisions` in frontmatter. This is a plan-text vs. tool-output correction, not a design change.
- Allowlisted `com.screenlimiter.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` after confirming its source (androidx.core 1.18.0, via the emoji2 dependency) in the manifest-merger provenance report, exactly per the plan's Task 2 step 4 guidance for a benign transitive library requirement. `app.json` did not need any `blockedPermissions`/`expo-build-properties` change - SDK levels and permissions were already minimal.
- `BlockActivity`'s `exported=false` check is scoped to the 5 lines following its own `android:name` attribute in the xmltree dump, rather than a manifest-wide grep, to avoid a false pass from an unrelated `exported=false` attribute elsewhere in the tree.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `aapt2 dump badging`'s actual field name is `minSdkVersion`, not `sdkVersion` as the plan's verify text specified**
- **Found during:** Task 2, while grounding the badging check against a real build's `aapt2 dump badging` output before finalizing the script
- **Issue:** The plan's action step (c) says to check for `sdkVersion:'24'`; running `aapt2 dump badging` against the actual assembled debug APK shows the field is named `minSdkVersion:'24'` - `sdkVersion:'24'` does not appear anywhere in real aapt2 output on this toolchain (build-tools 36.1.0). A script checking the plan's literal string would always fail regardless of the real SDK level.
- **Fix:** Wrote the check against `minSdkVersion:'24'` (the real field), confirmed present, keeping `targetSdkVersion:'36'` and `compileSdkVersion='36'` as specified.
- **Files modified:** scripts/audit-apk-manifest.sh
- **Verification:** `aapt2 dump badging android/app/build/outputs/apk/debug/app-debug.apk` shows all three fields; `scripts/audit-apk-manifest.sh` prints `SDK_LEVELS_OK: minSdk 24, targetSdk 36, compileSdk 36`
- **Committed in:** c661974 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1, a plan-text-vs-tool-output mismatch caught before the script was ever run against real output)
**Impact on plan:** The fix was necessary for the SDK-level check to test anything real; no scope creep beyond the single field name in the badging check.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FND-02 is now fully proven: config plugins are the sole source of every native surface (Plan 01-04), and that output is both byte-reproducible/idempotent and minimal at the built-APK level (this plan).
- The overlay permission (`SYSTEM_ALERT_WINDOW`) is confirmed absent from the installed APK - the precondition Plan 01-07's BAL spike needs is satisfied and gated by `pnpm verify:native`, not just asserted once.
- `scripts/gradle.sh` is ready for Plan 01-06 to reuse for JUnit test runs against the generated `android/` Gradle project.
- `scripts/audit-apk-manifest.sh`'s Task 2 step 4 branch (moving a permission to `app.json`'s `blockedPermissions` or raising SDK levels via `expo-build-properties`) was not needed this run - only one unlisted permission appeared, and it was a benign, self-scoped library requirement, allowlisted per the plan's own guidance.

## Known Stubs

None - both gate scripts are complete, production-quality verification tooling (not throwaway spike code). No hardcoded empty values or placeholder text.

## Self-Check: PASSED

- FOUND: scripts/verify-native-config.sh
- FOUND: scripts/audit-apk-manifest.sh
- FOUND: scripts/permission-allowlist.txt
- FOUND: scripts/gradle.sh
- FOUND commit 53ce38a
- FOUND commit c661974

---
*Phase: 01-foundation-block-launch-spike*
*Completed: 2026-09-28*
