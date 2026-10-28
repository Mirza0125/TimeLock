---
phase: 01-foundation-block-launch-spike
verified: 2026-09-28T20:35:00Z
status: passed
score: 5/5 must-haves verified
covered_files: [".planning/REQUIREMENTS.md", ".planning/ROADMAP.md", ".planning/phases/01-foundation-block-launch-spike/01-01-PLAN.md", ".planning/phases/01-foundation-block-launch-spike/01-01-SUMMARY.md", ".planning/phases/01-foundation-block-launch-spike/01-02-PLAN.md", ".planning/phases/01-foundation-block-launch-spike/01-02-SUMMARY.md", ".planning/phases/01-foundation-block-launch-spike/01-03-PLAN.md", ".planning/phases/01-foundation-block-launch-spike/01-03-SUMMARY.md", ".planning/phases/01-foundation-block-launch-spike/01-04-PLAN.md", ".planning/phases/01-foundation-block-launch-spike/01-04-SUMMARY.md", ".planning/phases/01-foundation-block-launch-spike/01-05-PLAN.md", ".planning/phases/01-foundation-block-launch-spike/01-05-SUMMARY.md", ".planning/phases/01-foundation-block-launch-spike/01-06-PLAN.md", ".planning/phases/01-foundation-block-launch-spike/01-06-SUMMARY.md", ".planning/phases/01-foundation-block-launch-spike/01-07-PLAN.md", ".planning/phases/01-foundation-block-launch-spike/01-07-SUMMARY.md", ".planning/phases/01-foundation-block-launch-spike/01-08-PLAN.md", ".planning/phases/01-foundation-block-launch-spike/01-08-SUMMARY.md", ".planning/phases/01-foundation-block-launch-spike/01-REVIEW-FIX.md", ".planning/phases/01-foundation-block-launch-spike/01-REVIEW.md", "app/_layout.tsx", "app/index.tsx", "docs/DEVELOPMENT.md", "docs/decisions/0001-block-launch-path.md", "eslint.config.js", "jest.config.js", "modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockActivity.kt", "modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockLauncher.kt", "modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockOutcomeDecider.kt", "modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockStrategyStore.kt", "modules/screen-guard/android/src/main/java/expo/modules/screenguard/GuardAccessibilityService.kt", "modules/screen-guard/android/src/main/java/expo/modules/screenguard/ScreenGuardModule.kt", "modules/screen-guard/src/ScreenGuard.types.ts", "modules/screen-guard/src/blockStrategy.ts", "modules/screen-guard/src/ruleEvaluationVectors.ts", "package.json", "plugins/withScreenGuardAndroid.js", "scripts/audit-apk-manifest.sh", "scripts/spike-block-launch.sh", "scripts/verify-clean-checkout.sh", "scripts/verify-native-config.sh"]
covered_digest: "v1:sha256:86afa5a11fa77f07615a38c6e62e066043397dbb60adbb0aa32be6eae6f885f2"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Look at the block screen, the notification shade, and the notification-tap reopening the block screen on the emulator (or the three committed screenshots: spike-evidence/activity-first-trial1.png, home-notification-shade.png, home-notification-tap.png), and confirm the UI is legible and the Close button visually reads as expected"
    expected: "'Blocked by ScreenLimiter' / 'Clock is blocked right now.' / 'Close app' render cleanly; the heads-up notification reads 'Clock is blocked - Tap to see why.'; tapping it visibly reopens the same block screen"
    why_human: "This is the open item in .planning/WINDOWS.md (id 1, status open): a visual/tactile confirmation the plan's own <human-check> blocks call for, deferred to end-of-phase per workflow.human_verify_mode=end-of-phase. Automated checks can prove component state and logcat sequencing but not whether the UI reads correctly to a person. Verifier note: screenshots were reviewed this session and visually match summary.json's claims, and the Back-to-launcher behavior (the other half of this same window item) was independently re-confirmed live via adb during this verification (topResumedActivity became the launcher, not Clock, after BACK) — but the ledger's own human sign-off has not been recorded, so this stays open rather than being marked passed by proxy."
---

# Phase 1: Foundation & Block-Launch Spike Verification Report

**Phase Goal:** A reproducible Expo SDK 57 project runs on the emulator with full quality tooling, the shared enforcement contract is frozen, and the API 36 block-launch question is answered with a working fallback before any enforcement code depends on it.
**Verified:** 2026-09-28T20:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | From a clean checkout, documented commands build and launch the app (Expo SDK 57, New Architecture, TypeScript ~5.9) on AVD `Medium_Phone_API_36.1` (FND-01) | ✓ VERIFIED | `scripts/verify-clean-checkout.sh` exists, clones HEAD to a temp dir, asserts no `node_modules`/`android`, runs `pnpm install --frozen-lockfile` + `bash scripts/run-android.sh --clean`, waits for the real Home-route text. 01-08-SUMMARY.md documents `CLEAN_CHECKOUT_OK` from an actual run this session (with two documented, now-fixed timeout/orphan-Metro bugs). Not independently re-cloned in this verification pass (a full native rebuild is a many-minute, ~multi-GB operation per the script's own header comment); instead the equivalent code paths were independently re-exercised live in this session (`bash scripts/run-android.sh` printed `APP_RUNNING pid=23185` on the main checkout, `pnpm verify` and `pnpm verify:native` both passed end to end) |
| 2 | `npx expo prebuild --clean` regenerates the same Android project: manifest, accessibility XML, `<queries>`, permissions all from config plugins; `android/` never hand-edited (FND-02) | ✓ VERIFIED | Live re-run this session: `pnpm verify:native` → `REPRO_CLEAN_OK`, `REPRO_IDEMPOTENT_OK`, `NATIVE_CONFIG_OK`, `PERMISSIONS_OK`, `SDK_LEVELS_OK: minSdk 24, targetSdk 36, compileSdk 36`, `APK_AUDIT_OK`, all exit 0. `git ls-files android` empty and `git check-ignore -q android` succeeds |
| 3 | With the spike accessibility service enabled, opening the test app on API 36 is interrupted by the block Activity or the fallback; both paths exercised; primary path recorded as a decision (FND-03) | ✓ VERIFIED | `spike-evidence/summary.json`: 5/5 `activityFirst` confirmed (latencies 202-691ms, 0 BAL-block lines), 5/5 `homeNotification` forced/reached-launcher/notification-posted, tap-reopens-block `true`. `docs/decisions/0001-block-launch-path.md` records `Primary path: activity-first`, scoped to the API 36 emulator, with the fallback explicitly kept wired. Live re-verification this session: opening Clock with the service enabled produced exactly one `BLOCK_ATTEMPT`/`BLOCK_OUTCOME path=activity reason=confirmed` pair, and pressing BACK on `BlockActivity` moved `topResumedActivity` to the launcher, not back to Clock — confirming code-review finding CR-01 (back button could return to the blocked app on API 33+) is fixed |
| 4 | ESLint (incl. no-left/right rule), Prettier, `tsc --noEmit`, Jest, ktlint, JUnit each run with a single command and pass (FND-04) | ✓ VERIFIED | Live re-run this session: `pnpm verify` exit 0, `RTL_RULE_OK` printed, Jest `Tests: 40 passed, 40 total` / `Test Suites: 4 passed, 4 total`. Forced (`--rerun-tasks`) re-run of `:screen-guard:testDebugUnitTest` and `ktlintCheck`: `BUILD SUCCESSFUL`, 19/19 JUnit tests printed `PASSED` (8 `SharedVectorsLoaderTest` + 11 `BlockOutcomeDeciderTest`, including the new CR-01 regression pin `alwaysGoHomeOnBackPress is pinned true`) |
| 5 | The `ScreenGuard` TS contract and shared JSON rule-evaluation vectors exist and load in both Jest and JUnit before either evaluator is written (FND-05) | ✓ VERIFIED | `modules/screen-guard/src/ScreenGuard.types.ts` exports the full frozen contract (13+ named types/interfaces, `FROZEN` header). `rule-evaluation.json` (schemaVersion 1, 21 vectors) is read by both `__tests__/sharedVectors.test.ts` (Jest) and `SharedVectorsLoaderTest.kt` (JUnit via `sourceSets.test.resources.srcDir`, not copied — `find modules/screen-guard/android -name rule-evaluation.json` returns nothing). No evaluator exists: `grep -rE "function (evaluate|evaluateRules)\b|export const evaluate" modules/screen-guard/src` and `find modules src -name 'LimitEngine*'` both empty |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified)

### Code Review Findings — Verified Fixed, Not Just Claimed

`01-REVIEW.md` found 1 critical + 5 warnings; `01-REVIEW-FIX.md` claims all 6 fixed. Independently re-checked against the current source (not the SUMMARY's word):

| ID | Finding | Verified in current source |
|----|---------|------------------------------|
| CR-01 | Back button on `BlockActivity` could return to the blocked app on API 33+ | `onBackPressed()` now unconditionally calls `goHome()` with no SDK branch (`BlockActivity.kt:56-68`); live on-device re-test confirmed BACK lands on the launcher, not Clock; `BlockOutcomeDeciderTest` pins `alwaysGoHomeOnBackPress()`, confirmed PASSED this session |
| WR-01 | Unguarded nullable `NotificationManager` could crash the fallback path | `BlockLauncher.kt:101-104` now null-guards with `?: run { ...; return false }` |
| WR-02 | Vector validator skipped `timeZone`/`mode`/`continuousUseMinutes`/`usageToday[].minutes`/`.opens` | `ruleEvaluationVectors.ts` now validates all five (lines 196-226) |
| WR-03 | APK audit missed `uses-permission-sdk-NN:` (maxSdkVersion-scoped) lines | `audit-apk-manifest.sh:75` regex now matches both forms |
| WR-04 | Config plugin could throw on an empty `manifest.queries` array | `withScreenGuardAndroid.js:108-110` now guards on array length, not nullishness |
| WR-05 | Home screen had no guard against overlapping strategy-press requests | `app/index.tsx:40-52` now uses a `requestIdRef` generation token, confirmed present and matching the described fix |

All six are confirmed fixed in the actual files, not merely asserted in the SUMMARY/REVIEW-FIX doc.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `scripts/env.sh`, `run-android.sh`, `metro.sh`, `emu-ui.mjs`, `e2e-skeleton.sh` | Non-interactive build/E2E loop | ✓ VERIFIED | All exist; `run-android.sh` produced `APP_RUNNING` live this session |
| `modules/screen-guard/src/ScreenGuard.types.ts` | Frozen contract | ✓ VERIFIED | Present, `FROZEN` header, `satisfies ScreenGuardApi` test passes |
| `modules/screen-guard/shared-test-vectors/rule-evaluation.json` | 21 shared vectors | ✓ VERIFIED | schemaVersion 1, 21 vectors, loaded by both harnesses, not copied |
| `plugins/withScreenGuardAndroid.js` | Sole source of native block-path config | ✓ VERIFIED | `withDangerousMod`/`withAndroidManifest` present; `pnpm verify:native` structural checks pass live |
| `scripts/verify-native-config.sh`, `audit-apk-manifest.sh`, `permission-allowlist.txt`, `gradle.sh` | FND-02 proof + APK audit | ✓ VERIFIED | Ran live, all markers printed |
| `scripts/spike-block-launch.sh` + `spike-evidence/*` | Repeatable spike + evidence | ✓ VERIFIED | Script exists; evidence files present and non-empty; screenshots visually reviewed and match `summary.json` |
| `docs/decisions/0001-block-launch-path.md` | Recorded, scoped, evidence-checked decision | ✓ VERIFIED | Decision rule applied correctly to the evidence; scope disclaimer present; fallback-stays-wired language present |
| `docs/DEVELOPMENT.md` | Full developer guide | ✓ VERIFIED | Exists; contains `pnpm verify`, `verify:native`, `0001-block-launch-path`, "restricted settings" per plan's acceptance criteria |
| `.editorconfig`, module `build.gradle` (ktlint), JUnit test classes | Kotlin gates | ✓ VERIFIED | ktlint 14.2.0 wired; JUnit tests present and passing (re-confirmed live) |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `app/index.tsx` | `modules/screen-guard/index.ts` | `getBlockStrategy`/`setBlockStrategy` calls | ✓ WIRED (re-confirmed via logcat during live device test) |
| `modules/screen-guard/src/ScreenGuardModule.ts` | Kotlin `ScreenGuardModule.kt` | `requireNativeModule('ScreenGuard')` | ✓ WIRED |
| `plugins/withScreenGuardAndroid.js` | `GuardAccessibilityService.kt` / `BlockActivity.kt` | manifest `android:name` FQCN match | ✓ WIRED — confirmed in the generated `android/app/src/main/AndroidManifest.xml` this session |
| `modules/screen-guard/android/build.gradle` | `shared-test-vectors/rule-evaluation.json` | `sourceSets.test.resources.srcDir` | ✓ WIRED — `SharedVectorsLoaderTest` PASSED live, reading the one file (not a copy) |
| `docs/decisions/0001-block-launch-path.md` | `spike-evidence/summary.json` | decision rule applied to the evidence | ✓ WIRED — hand-checked the rule (`confirmed===5`, `maxLatencyMs=691<1500`, `balBlockLogLines=0` → all hold) against the recorded "Primary path: activity-first" |

### Behavioral Spot-Checks (live, this session)

| Behavior | Command | Result | Status |
|---|---|---|---|
| App builds and boots | `bash scripts/run-android.sh` | `APP_RUNNING pid=23185` | ✓ PASS |
| Native config reproducible/idempotent | `pnpm verify:native` | `REPRO_CLEAN_OK`, `REPRO_IDEMPOTENT_OK`, `NATIVE_CONFIG_OK`, `APK_AUDIT_OK` | ✓ PASS |
| All 6 quality gates | `pnpm verify` | exit 0, `RTL_RULE_OK`, `40 passed, 40 total` | ✓ PASS |
| Kotlin JUnit tests (forced rerun) | `bash scripts/gradle.sh :screen-guard:testDebugUnitTest --rerun-tasks` | 19/19 PASSED, 0 FAILED | ✓ PASS |
| Block-launch cascade + CR-01 fix | enable service, launch Clock, press BACK | exactly one `BLOCK_ATTEMPT`/`BLOCK_OUTCOME`; `topResumedActivity` = launcher after BACK | ✓ PASS |
| android/ untracked | `git ls-files android` / `git check-ignore -q android` | empty / exit 0 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| FND-01 | 01-01, 01-08 | Build/run from clean checkout | ✓ SATISFIED | See Truth 1 |
| FND-02 | 01-04, 01-05 | Native config from plugins only, reproducible | ✓ SATISFIED | See Truth 2 |
| FND-03 | 01-04, 01-07 | Block-launch spike + recorded decision | ✓ SATISFIED | See Truth 3 |
| FND-04 | 01-02, 01-06, 01-08 | Six quality gates, single command each | ✓ SATISFIED | See Truth 4 |
| FND-05 | 01-03, 01-06 | Frozen contract + shared vectors, no evaluator yet | ✓ SATISFIED | See Truth 5 |

No orphaned requirements: REQUIREMENTS.md traceability table maps only FND-01..05 to Phase 1, and the union of every plan's frontmatter `requirements:` field (FND-01, FND-02, FND-03, FND-04, FND-05) exactly matches. REQUIREMENTS.md itself already has FND-01..05 checked `[x]`.

### Anti-Patterns Found

None. `grep -rnE "TODO|FIXME|XXX|HACK|not implemented|placeholder"` across every phase-touched TS/TSX/Kotlin/JS/Gradle/Markdown file (app/, modules/, plugins/, scripts/, README.md, docs/DEVELOPMENT.md, the decision doc) returned zero matches. `IN-01` (Kotlin `lintOptions { abortOnError false }`) and `IN-02` (shared global confirmation signal) remain from the code review as acknowledged, non-blocking info-level items — correctly left unfixed (out of the review-fix's `critical_warning` scope) and not phase-goal blockers.

### Human Verification Required

1. **Visual/tactile confirmation of the block UI and notification-tap flow**
   - **Test:** Look at the block screen, notification shade, and notification-tap reopening the block screen (live on the emulator, or the three committed screenshots)
   - **Expected:** "Blocked by ScreenLimiter" / "Clock is blocked right now." / "Close app" render legibly; the heads-up notification reads "Clock is blocked - Tap to see why."; tapping it visibly reopens the block screen
   - **Why human:** This is the one open item in `.planning/WINDOWS.md` (id 1): the plan's own `<human-check>` block for Task 2 (Plan 01-01/01-04), deferred to end-of-phase per `workflow.human_verify_mode=end-of-phase`. Automated checks and this session's live re-verification already confirm the underlying component states and logcat sequencing (including the CR-01 back-button fix), and the three evidence screenshots were reviewed this session and visually match `summary.json`'s claims exactly — but the ledger's own required human sign-off has not been recorded yet, so it is surfaced here rather than silently closed.

### Gaps Summary

No gaps. All 5 ROADMAP success criteria (FND-01 through FND-05) are verified against the live codebase and emulator, not just against SUMMARY.md claims — quality gates were re-run and re-confirmed in this session (including a forced, non-cached Gradle re-run to see real `PASSED` lines rather than `UP-TO-DATE` cache hits), the native-config reproducibility/APK-audit gate was re-run live, and the CR-01 code-review fix was independently re-verified on-device via adb rather than trusted from the fix report alone. The only open item is a single, already-tracked (`WINDOWS.md`) human visual sign-off that was deliberately deferred to end-of-phase by project workflow policy — it is not a functional gap, and strong automated + screenshot evidence for it already exists.

---

_Verified: 2026-09-28T20:35:00Z_
_Verifier: Claude (gsd-verifier)_


## Human Verification Result

User approved the block screen, fallback notification and notification-tap flow on 2026-09-29 (01-UAT.md, test 1: pass). WINDOWS.md item 1 marked fixed. Status updated human_needed -> passed.
