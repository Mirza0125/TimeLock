---
phase: 01-foundation-block-launch-spike
fixed_at: 2026-09-28T15:24:49Z
review_path: .planning/phases/01-foundation-block-launch-spike/01-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-09-28T15:24:49Z
**Source review:** .planning/phases/01-foundation-block-launch-spike/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (fix_scope: critical_warning -> CR-01, WR-01..WR-05)
- Fixed: 6
- Skipped: 0

**Verification environment:** all edits were made and committed directly in the main
checkout (no isolated worktree) because `workflow.use_worktrees` is `false` in
`.planning/config.json` (`gsd-code-review --fix`'s documented opt-out). `pnpm verify`
and the CR-01 on-device re-verification below were both run from that same main
checkout, so the results are reproducible from the tree as it stands after this run.

## Fixed Issues

### CR-01: Back button/gesture on BlockActivity can return the user to the blocked app on API 33+

**Files modified:** `modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockActivity.kt`, `modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockOutcomeDecider.kt`, `modules/screen-guard/android/src/test/java/expo/modules/screenguard/BlockOutcomeDeciderTest.kt`
**Commit:** 0c620d5
**Applied fix:** `BlockActivity.onBackPressed()` no longer branches on `Build.VERSION.SDK_INT` and no longer falls through to `super.onBackPressed()` on API 33+. It now unconditionally calls `goHome()` on every SDK level, since `enableOnBackInvokedCallback` is app-wide `"false"` (from `app.json`'s `predictiveBackGestureEnabled: false`), which means the `OnBackInvokedCallback` registered in `onCreate` is never invoked by the platform on any SDK level - back navigation always reaches the legacy `onBackPressed()` path. Added a pure, JVM-testable invariant `BlockOutcomeDecider.alwaysGoHomeOnBackPress()` (returns `true`, hardcoded) that `onBackPressed()` now consults via `check(...)`, and a new `BlockOutcomeDeciderTest` case pinning it - this is a regression guard for the documented invariant, since the Activity's own back-press dispatch cannot be unit-tested on the JVM without a Robolectric dependency (not present in this module).
**Verification:**
- `pnpm test:kotlin` (JUnit, `:screen-guard:testDebugUnitTest`): all tests pass, including the new pinned-invariant test.
- `pnpm lint:kotlin` (ktlint): clean.
- **Live on-device re-verification** (emulator-5554, per orchestrator instructions): rebuilt and reinstalled via `bash scripts/run-android.sh` (`APP_RUNNING pid=19968`), enabled the guard service (`bash scripts/guard-service.sh enable`), launched Clock (`com.google.android.deskclock`) - confirmed `topResumedActivity=...BlockActivity`, then `adb shell input keyevent KEYCODE_BACK`. After Back: `topResumedActivity=...com.google.android.apps.nexuslauncher/.NexusLauncherActivity` (the launcher, not Clock). `adb logcat -d -s ScreenGuard:I` shows exactly one `BLOCK_ATTEMPT pkg=com.google.android.deskclock` and one `BLOCK_OUTCOME path=activity reason=confirmed` - no second `BLOCK_ATTEMPT` appears after Back (previously a second attempt appeared ~0.8s after Back, confirming the app had briefly returned to the foreground). Re-checked logcat again after a 2s wait: still only one `BLOCK_ATTEMPT`. Guard service disabled afterward to leave a clean device state.

### WR-01: Unguarded nullable `NotificationManager` can crash the guaranteed fallback path

**Files modified:** `modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockLauncher.kt`
**Commit:** 208b3a0
**Applied fix:** `postFallbackNotification` now null-guards `service.getSystemService(NotificationManager::class.java)` with `?: run { ...; return false }` (logging `NOTIFY_SKIPPED reason=no_notification_manager pkg=$pkg`) before calling `.areNotificationsEnabled()`, exactly as suggested in the review, consistent with the safe-call pattern already used at `BlockActivity.kt:89`.
**Verification:** `pnpm test:kotlin` and `pnpm lint:kotlin` both pass.

### WR-02: Shared rule-evaluation vector validator doesn't check all required `RuleEvaluationInput` fields

**Files modified:** `modules/screen-guard/src/ruleEvaluationVectors.ts`
**Commit:** 92ecbcd
**Applied fix:** `parseRuleEvaluationVectorFile` now validates `input.timeZone` (must be a string), `input.mode` (must be `"self"` or `"child"`), `input.continuousUseMinutes` (must be a number), and `input.usageToday[i].minutes` / `.opens` (must be numbers) - closing the gap the review identified relative to `RuleEvaluationInput`'s required fields in `ScreenGuard.types.ts`.
**Verification:** `pnpm typecheck` clean; `pnpm lint` (eslint on this file) clean; `npx jest __tests__/sharedVectors.test.ts __tests__/blockStrategy.test.ts __tests__/screenGuardContract.test.ts` - all 37 tests pass (confirmed beforehand via a standalone Node check that all 21 vectors in the real `rule-evaluation.json` already satisfy every newly-added check, so the stricter validator does not break the existing shared vectors file).

### WR-03: APK permission audit misses `maxSdkVersion`-scoped permission declarations

**Files modified:** `scripts/audit-apk-manifest.sh`
**Commit:** e32ba79
**Applied fix:** Broadened the `sed` extraction pattern from `s/.*uses-permission: name='\([^']*\)'.*/\1/p` to `s/.*uses-permission\(-sdk-[0-9]\+\)\?: name='\([^']*\)'.*/\2/p`, matching both plain `uses-permission:` and `uses-permission-sdk-NN:` (maxSdkVersion-scoped) lines from `aapt2 dump permissions`, exactly as suggested.
**Verification:** `bash -n scripts/audit-apk-manifest.sh` (syntax check) clean. Ran the script's own `--check-permissions-stdin` self-test mode with synthetic input: a `uses-permission-sdk-23: name='android.permission.READ_EXTERNAL_STORAGE'` line (denylisted) is now correctly caught (`DENYLISTED PERMISSION`, exit 1) where it previously would have silently passed through undetected; a plain allowlisted permission still passes (exit 0); a plain unlisted permission is still correctly flagged (exit 1) - confirming no regression to the existing plain-form matching.

### WR-04: `withScreenGuardAndroid.js` can throw if `manifest.queries` is an empty array

**Files modified:** `plugins/withScreenGuardAndroid.js`
**Commit:** 4a61d40
**Applied fix:** Replaced the nullish-coalescing guard (`manifest.queries = manifest.queries ?? [{}];`) with an array-length guard (`if (!Array.isArray(manifest.queries) || manifest.queries.length === 0) { manifest.queries = [{}]; }`), so a valid non-nullish empty array set by an earlier mod in the chain no longer causes `manifest.queries[0]` to be `undefined` and throw on the next line.
**Verification:** `node -c plugins/withScreenGuardAndroid.js` (syntax check) clean; `pnpm lint` (eslint on this file) clean. This plugin also ran successfully as part of `bash scripts/run-android.sh`'s `expo prebuild --platform android` step during the CR-01 on-device re-verification (prebuild completed with `Finished prebuild`, no throw), exercising this exact code path end-to-end.

### WR-05: Home screen doesn't guard against overlapping strategy-change requests

**Files modified:** `app/index.tsx`
**Commit:** 6bd0502
**Applied fix:** Added a `requestIdRef` generation-token guard (via `useRef`) around `onPressStrategy`: each press increments the ref and captures its own `requestId`; both the success and error branches check `requestId !== requestIdRef.current` and bail out early if a newer press has superseded them, preventing a stale response from overwriting state set by a more recent press.
**Verification:** `pnpm typecheck` clean; `pnpm lint` (eslint on this file) clean; `npx jest __tests__/home-screen.test.tsx` - all 3 tests pass (pre-existing `act()` console warnings in the test output are unrelated test-environment noise from the same async-then-setState pattern that existed before this change, not a new failure).

## Skipped Issues

None — all 6 in-scope findings (CR-01, WR-01 through WR-05) were fixed.

## Full-suite verification

`pnpm verify` (lint, format:check, typecheck, test, lint:kotlin, test:kotlin) ran clean
end-to-end after all six fixes were committed: exit code 0, `RTL_RULE_OK` printed,
`Test Suites: 4 passed, 4 total` (Jest), and both Kotlin Gradle tasks
(`ktlintCheck`, `testDebugUnitTest`) reported `BUILD SUCCESSFUL`.

Info-level findings (IN-01, IN-02) were out of scope for this run (`fix_scope:
critical_warning`) and were left untouched.

---

_Fixed: 2026-09-28T15:24:49Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
