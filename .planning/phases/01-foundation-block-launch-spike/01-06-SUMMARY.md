---
phase: 01-foundation-block-launch-spike
plan: 06
subsystem: testing
tags: [ktlint, gradle, junit, kotlin, shared-test-vectors, block-outcome-decider]

# Dependency graph
requires:
  - phase: 01-04
    provides: BlockOutcomeDecider.kt pure decision contract (BlockPath, BlockOutcomeReason, BlockDecision, CONFIRM_DEADLINE_MS=800, DEBOUNCE_MS=1500) - this plan unit-tests it on the JVM
  - phase: 01-03
    provides: modules/screen-guard/shared-test-vectors/rule-evaluation.json and the TS REQUIRED_VECTOR_TAGS/validation contract this plan mirrors in JUnit
  - phase: 01-05
    provides: scripts/gradle.sh (env-sourcing gradlew wrapper), reused unmodified for both ktlint and JUnit invocations
provides:
  - pnpm lint:kotlin / format:kotlin (org.jlleitschuh.gradle.ktlint 14.2.0, applied via plugins{} block, no buildscript fallback needed) over modules/screen-guard/android - proven to have teeth via a throwaway violating probe file
  - pnpm test:kotlin (:screen-guard:testDebugUnitTest) - JUnit 4.13.2 + org.json 20260814 (testImplementation), android.sourceSets.test.resources.srcDir pointing at ../shared-test-vectors so the ONE rule-evaluation.json file is read by both Jest and JUnit
  - SharedVectorsLoaderTest.kt - JVM-side re-check of the TS validator's consistency rules (schemaVersion, 21 unique ids, nowIso/expectedUntilIso UTC rendering, rule types, block reasons, required tags)
  - BlockOutcomeDeciderTest.kt - pins the Plan 01-04 assumption-delta invariant (every attempt resolves to exactly one of ACTIVITY/FALLBACK, never NONE, for all four launchThrew/confirmed combinations) ahead of Plan 01-07's spike
  - .editorconfig - root config with android_studio ktlint style for *.kt/*.kts, confirmed not to regress Prettier
affects: [01-07 (BAL spike - BlockOutcomeDecider is now pinned at its boundaries before the spike records real outcomes), 01-08 (whichever plan runs the full multi-language gate suite end to end)]

actuals:
  tokens: 11783
  tasks: 2
  commits: 2

tech-stack:
  added:
    - "org.jlleitschuh.gradle.ktlint 14.2.0 (Gradle Plugin Portal, resolved via plugins{} block on the first try - no buildscript{gradlePluginPortal()} fallback needed)"
    - "junit:junit 4.13.2 and org.json:json 20260814 (testImplementation only - never ships in the APK)"
  patterns:
    - "One shared JSON vectors file loaded by two test runners via Gradle's sourceSets.test.resources.srcDir pointing outside the module's own tree - never copied, so Jest/JUnit divergence is structurally impossible"
    - "ktlint-gradle's ktlintFormat run once up front to normalize all pre-existing Kotlin sources to the frozen .editorconfig style (android_studio, 4-space) before wiring the check gate, so the gate's first real run starts clean"
    - "Gate-teeth probe pattern (throwaway violating file, cleaned up via trap) reused from Plan 01-05's audit-apk-manifest.sh self-test idea, applied here to ktlintCheck"

key-files:
  created:
    - .editorconfig
    - modules/screen-guard/android/src/test/java/expo/modules/screenguard/SharedVectorsLoaderTest.kt
    - modules/screen-guard/android/src/test/java/expo/modules/screenguard/BlockOutcomeDeciderTest.kt
  modified:
    - modules/screen-guard/android/build.gradle
    - package.json
    - modules/screen-guard/android/src/main/java/expo/modules/screenguard/ScreenGuardModule.kt
    - modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockStrategyStore.kt
    - modules/screen-guard/android/src/main/java/expo/modules/screenguard/GuardAccessibilityService.kt
    - modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockActivity.kt
    - modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockLauncher.kt
    - modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockOutcomeDecider.kt

key-decisions:
  - "ktlint-gradle 14.2.0 resolved cleanly through the standard `plugins { id ... version ... }` block against the Gradle Plugin Portal - the plan's documented buildscript{} fallback for a resolution failure was never needed."
  - "The Gradle project path is `:screen-guard` (confirmed via `bash scripts/gradle.sh -q projects`), with projectDir resolving to modules/screen-guard/android - so `$projectDir/../shared-test-vectors` in build.gradle deterministically resolves to modules/screen-guard/shared-test-vectors/, settling 01-RESEARCH.md's Open Question 2 exactly as anticipated."
  - "ktlintFormat's android_studio style reformatted all 5 pre-existing main-source Kotlin files from 2-space to 4-space indentation (336 lines changed) with zero behavior change, confirmed by a clean `compileDebugKotlin` afterward - this is the one-time cost of adopting a stricter style guide on already-written code, not a bug."
  - "Discovered and worked around a stale-report caching quirk in ktlint-gradle 14.2.0 / Gradle 9.3.1's incremental up-to-date check: after removing the ktlint-teeth probe file, `ktlintCheck` continued to fail citing the deleted file's violations across a plain re-run, a `--stop`'d daemon, and even `--no-daemon` - only `--rerun-tasks` (combined with `--no-build-cache` while diagnosing) forced a genuine rescan and cleared the stale result. This is worth knowing for anyone re-running a similar throwaway-probe experiment: after deleting a probe file, run `./gradlew --rerun-tasks :screen-guard:ktlintCheck` once to flush the stale task-history entry, not just a plain re-run."

patterns-established:
  - "Every Kotlin quality gate for this module runs through package.json scripts (`lint:kotlin`, `format:kotlin`, `test:kotlin`) delegating to `scripts/gradle.sh :screen-guard:<task>` - consistent with the existing `verify:native*` pattern from Plan 01-05, so `pnpm <gate>` is the single command story for every language in this repo."

requirements-completed: [FND-04, FND-05]

coverage:
  - id: D1
    description: "pnpm lint:kotlin runs ktlint (org.jlleitschuh.gradle.ktlint 14.2.0) over the screen-guard module's main and test Kotlin sources and exits 0, with the gate proven to have teeth (fails on a real violation, probe removed afterward)"
    requirement: "FND-04"
    verification:
      - kind: other
        ref: "pnpm lint:kotlin - BUILD SUCCESSFUL, ktlintMainSourceSetCheck executed (not NO-SOURCE); throwaway KtlintProbe.kt (wildcard import + missing spacing) made ktlintCheck fail (KTLINT_TEETH_OK), then was removed and lint:kotlin passed clean again"
        status: pass
    human_judgment: false
  - id: D2
    description: "pnpm test:kotlin runs JUnit 4.13.2 on the JVM and executes real tests (PASSED lines for SharedVectorsLoaderTest and BlockOutcomeDeciderTest), no failures"
    requirement: "FND-05"
    verification:
      - kind: unit
        ref: "pnpm test:kotlin (:screen-guard:testDebugUnitTest) - 18/18 tests PASSED (7 SharedVectorsLoaderTest, 11 BlockOutcomeDeciderTest), zero FAILED lines, confirmed via a forced --rerun-tasks run producing fresh console PASSED lines"
        status: pass
    human_judgment: false
  - id: D3
    description: "JUnit loads the SAME modules/screen-guard/shared-test-vectors/rule-evaluation.json Jest loads (via Gradle test resources srcDir, not a copy), finds 21 vectors, and applies the same consistency checks (nowIso/nowMs, block fields, rule types, required tags) as the TS validator"
    requirement: "FND-05"
    verification:
      - kind: unit
        ref: "SharedVectorsLoaderTest.kt - 7 tests covering classpath loading, schemaVersion/count/uniqueness, nowIso UTC rendering, decision enum, block-field validity + expectedUntilIso rendering, rule-type validity, and REQUIRED_VECTOR_TAGS coverage, all PASSED; find modules/screen-guard/android/src -name rule-evaluation.json returns 0 (no copy in source tree)"
        status: pass
    human_judgment: false
  - id: D4
    description: "BlockOutcomeDeciderTest encodes the promote invariant: every activity attempt resolves to exactly one of ACTIVITY/FALLBACK; unconfirmed or failed activity attempts and homeNotification both resolve to FALLBACK; resume at exactly 800ms is confirmed, 801ms and a stale (negative-delta) resume are not"
    requirement: "FND-05"
    verification:
      - kind: unit
        ref: "BlockOutcomeDeciderTest.kt - 11 tests including an exhaustive 4-combination sweep of resolveActivityAttempt asserting the path is never NONE, isConfirmed boundary tests at 800ms/801ms/-1ms, forcedFallback/disabled, and the frozen CONFIRM_DEADLINE_MS=800/DEBOUNCE_MS=1500 constants, all PASSED"
        status: pass
    human_judgment: false

duration: 24min
completed: 2026-09-28
status: complete
---

# Phase 1 Plan 06: Kotlin Quality Gates - ktlint + JUnit Summary

**`pnpm lint:kotlin` and `pnpm test:kotlin` are single passing commands over the screen-guard Android module - ktlint 14.2.0 with a proven-toothed gate, and JUnit 4.13.2 loading the exact same shared vectors JSON Jest reads while pinning the block-path decision invariant ahead of the BAL spike.**

## Performance

- **Duration:** ~24 min
- **Started:** 2026-09-28T13:24:54Z (previous plan's completion commit)
- **Completed:** 2026-09-28T13:48:42Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- `org.jlleitschuh.gradle.ktlint` `14.2.0` is applied directly in `modules/screen-guard/android/build.gradle`'s `plugins {}` block (Gradle Plugin Portal resolved it on the first try - the plan's `buildscript{}` fallback for a resolution failure was never needed), wired to `pnpm lint:kotlin` / `pnpm format:kotlin` via `scripts/gradle.sh :screen-guard:ktlintCheck` / `ktlintFormat`.
- `.editorconfig` freezes `android_studio` ktlint style for `*.kt`/`*.kts` (4-space indent, 120 max line) alongside UTF-8/LF/final-newline globally; `pnpm format:check` (Prettier) confirmed unaffected.
- `ktlintFormat` reformatted all 5 pre-existing Kotlin sources from 2-space to the frozen 4-space style - a pure, behavior-free reformat confirmed by a clean `compileDebugKotlin` run afterward.
- The gate's teeth were proven with a throwaway violating probe file (wildcard import, missing spacing) that made `ktlintCheck` fail, then was removed - `pnpm lint:kotlin` now passes clean with zero baseline files anywhere in the module.
- `modules/screen-guard/android/build.gradle` adds `testImplementation` `junit:junit:4.13.2` and `org.json:json:20260814`, plus `android.sourceSets.test.resources.srcDir("$projectDir/../shared-test-vectors")` - the ONE `rule-evaluation.json` file, never copied, is on the JUnit classpath exactly as it is in Jest's `import`.
- `SharedVectorsLoaderTest.kt` (7 tests) and `BlockOutcomeDeciderTest.kt` (11 tests) both pass, printing real `PASSED` lines under `pnpm test:kotlin` (`:screen-guard:testDebugUnitTest`) - 18/18, zero failures.
- The Gradle project path is confirmed as `:screen-guard` (`bash scripts/gradle.sh -q projects`), settling 01-RESEARCH.md's Open Question 2 about the relative path from the generated `android/` tree to the shared vectors.

## Task Commits

1. **Task 1: ktlint as a single command over the module's Kotlin - passing, formatted, and proven to fail on a violation** - `b406a3a` (feat)
2. **Task 2: JUnit loads the shared vectors and pins the block-path invariant - `pnpm test:kotlin` passes with real tests** - `efb36ce` (test)

**Plan metadata:** pending (this docs commit)

## Files Created/Modified

- `.editorconfig` - root config, `ktlint_code_style = android_studio` for `*.kt`/`*.kts`
- `modules/screen-guard/android/build.gradle` - ktlint plugin 14.2.0; `testImplementation` junit 4.13.2 + org.json 20260814; `sourceSets.test.resources.srcDir` pointing at the shared vectors; `testLogging` for passed/skipped/failed with full exception format
- `package.json` - `lint:kotlin`, `format:kotlin`, `test:kotlin` scripts added
- `modules/screen-guard/android/src/test/java/expo/modules/screenguard/SharedVectorsLoaderTest.kt` - JVM-side shared-vectors consistency checks mirroring the TS validator
- `modules/screen-guard/android/src/test/java/expo/modules/screenguard/BlockOutcomeDeciderTest.kt` - pins the block-path decision invariant
- `modules/screen-guard/android/src/main/java/expo/modules/screenguard/{ScreenGuardModule,BlockStrategyStore,GuardAccessibilityService,BlockActivity,BlockLauncher,BlockOutcomeDecider}.kt` - reformatted to `android_studio` ktlint style (2-space to 4-space indent), no behavior change

## Decisions Made

- ktlint-gradle `14.2.0` resolved through the standard `plugins{}` block against the Gradle Plugin Portal on the first attempt - no `buildscript{gradlePluginPortal()}` fallback needed (see `key-decisions` in frontmatter).
- Ran `ktlintFormat` once up front on the pre-existing Kotlin sources before wiring the check gate, so the very first `ktlintCheck` run starts clean rather than immediately failing on inherited style debt from Plans 01-01/01-04.
- `BlockOutcomeDeciderTest`'s never-NONE assertion is written as an exhaustive sweep over all four `(launchThrew, confirmed)` combinations rather than four separate hand-picked cases, directly encoding the "every non-disabled attempt resolves to exactly one of ACTIVITY/FALLBACK" invariant from 01-04-PLAN.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ktlintCheck initially failed on the new JUnit test sources (trailing commas, import ordering) before a second `ktlintFormat` pass**
- **Found during:** Task 2, step 5 ("Re-run `pnpm lint:kotlin`")
- **Issue:** The hand-written `SharedVectorsLoaderTest.kt` and `BlockOutcomeDeciderTest.kt` used trailing commas in multi-line calls and non-lexicographic import ordering, both real `android_studio` ktlint style violations (not tool flakiness) - `pnpm lint:kotlin` correctly failed on them.
- **Fix:** Ran `pnpm format:kotlin` again, which auto-fixed both classes of violation; re-ran `pnpm lint:kotlin` (clean) and `pnpm test:kotlin` (still 18/18 PASSED) to confirm the reformat changed no behavior.
- **Files modified:** modules/screen-guard/android/src/test/java/expo/modules/screenguard/SharedVectorsLoaderTest.kt, modules/screen-guard/android/src/test/java/expo/modules/screenguard/BlockOutcomeDeciderTest.kt
- **Verification:** `pnpm lint:kotlin` BUILD SUCCESSFUL with test sources included; `pnpm test:kotlin` re-confirmed 18/18 PASSED after the reformat
- **Committed in:** efb36ce (Task 2 commit - the test files were committed already-formatted, so no separate fix commit was needed)

---

**Total deviations:** 1 auto-fixed (Rule 1, confined to this plan's own new test files, caught by the plan's own step 5 instruction to re-run the linter)
**Impact on plan:** No scope creep - the fix was exactly the plan's own prescribed step 5, executed as written.

## Issues Encountered

- **ktlint-gradle 14.2.0 / Gradle 9.3.1 stale-report caching after file deletion.** After running the gate-teeth probe (a throwaway violating `KtlintProbe.kt`, cleaned up via `trap ... EXIT`), a subsequent plain `pnpm lint:kotlin` continued to report the probe's violations as if the file still existed - reproduced across a plain re-run, `./gradlew --stop` (fresh daemon), and even `--no-daemon`. Confirmed via `find` that the file was genuinely absent from the entire filesystem at every check. Root cause not fully isolated (likely a `ktlintMainSourceSetCheck` lifecycle-task-vs-underlying-worker-task up-to-date interaction specific to this Gradle/plugin combination), but `./gradlew --rerun-tasks :screen-guard:ktlintCheck` (combined with `--no-build-cache` while diagnosing) reliably forced a genuine rescan and cleared the stale result on the first try. Recorded in `key-decisions` for anyone repeating a similar probe-based teeth test on this module.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FND-04's Kotlin half and FND-05's JUnit half are both satisfied: `pnpm lint:kotlin` and `pnpm test:kotlin` are each single passing commands, and the shared vectors load identically in Jest and JUnit from one file.
- `BlockOutcomeDecider`'s decision contract is now pinned by 11 JVM tests, ahead of Plan 01-07's spike - the spike's recorded activity/fallback outcomes will come from logic already proven correct at its boundaries (initial path mapping, confirm-deadline boundary, launch-error precedence, debounce gate), not from an untested assumption.
- Gradle/toolchain versions confirmed via `bash scripts/gradle.sh --version` and the build output: Gradle `9.3.1`, Kotlin `2.2.21` (Gradle's embedded Kotlin, used for build scripts - not the Android Kotlin compiler version, which AGP manages separately), AGP `8.12.0` (resolved dependency, matching `scripts/env.sh`'s documented minimum), JDK `17.0.20.1` (Eclipse Adoptium).
- Anyone re-running the gate-teeth probe technique against this module should follow with `--rerun-tasks` once after removing the probe file, per the Issues Encountered note above, to avoid a false "still failing" reading.

## Known Stubs

None - both test classes are complete, production-quality verification code (not throwaway spike code), and the ktlint/JUnit wiring is the real single-command gate, not a placeholder.

## Self-Check: PASSED

- FOUND: .editorconfig
- FOUND: modules/screen-guard/android/src/test/java/expo/modules/screenguard/SharedVectorsLoaderTest.kt
- FOUND: modules/screen-guard/android/src/test/java/expo/modules/screenguard/BlockOutcomeDeciderTest.kt
- FOUND commit b406a3a
- FOUND commit efb36ce

---
*Phase: 01-foundation-block-launch-spike*
*Completed: 2026-09-28*
