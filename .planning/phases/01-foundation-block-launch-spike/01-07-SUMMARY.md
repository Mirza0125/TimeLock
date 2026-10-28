---
phase: 01-foundation-block-launch-spike
plan: 07
subsystem: infra
tags: [android, accessibility-service, bal, block-launch, adb, spike, kotlin]

requires:
  - phase: 01-foundation-block-launch-spike (Plan 01-04)
    provides: BlockLauncher two-path cascade (BLOCK_ATTEMPT/BLOCK_RESUMED/BLOCK_OUTCOME logcat contract), BlockStrategyStore, BlockOutcomeDecider
  - phase: 01-foundation-block-launch-spike (Plan 01-06)
    provides: ktlint + JUnit gates over screen-guard's Kotlin
provides:
  - scripts/spike-block-launch.sh (--trials N, repeatable for Phase 12 re-validation)
  - spike-evidence/ (summary.json + 2 logcat files + 3 screenshots) proving both block paths on API 36
  - docs/decisions/0001-block-launch-path.md (Primary path: activity-first, machine-checked against summary.json)
  - BlockStrategyStore.DEFAULT_STRATEGY companion constant aligned to the recorded primary
affects: [Phase 2 (BlockLauncher/enforcement configuration uses activity-first as default), Phase 7 (onboarding/notification-permission criticality depends on which path is primary), Phase 12 (re-run this spike for the API 24-36 compatibility matrix)]

actuals:
  tokens: 9602
  tasks: 2
  commits: 2
plan_head_before: f614b0d01c3e6897800daa0c49dbeb5095fd77cc

tech-stack:
  added: []
  patterns:
    - "Spike decision rule declared in the plan BEFORE the evidence existed, then a verify command mechanically re-derives the decision from summary.json and fails on mismatch (repudiation mitigation, T-01-19)"
    - "Exemption controls as preconditions: 12s post-visibility grace, overlay-permission-absent assertion (declared + appop), notification-tap excluded from activity-path evidence"

key-files:
  created:
    - scripts/spike-block-launch.sh
    - .planning/phases/01-foundation-block-launch-spike/spike-evidence/summary.json
    - .planning/phases/01-foundation-block-launch-spike/spike-evidence/logcat-activity-first.txt
    - .planning/phases/01-foundation-block-launch-spike/spike-evidence/logcat-home-notification.txt
    - .planning/phases/01-foundation-block-launch-spike/spike-evidence/activity-first-trial1.png
    - .planning/phases/01-foundation-block-launch-spike/spike-evidence/home-notification-shade.png
    - .planning/phases/01-foundation-block-launch-spike/spike-evidence/home-notification-tap.png
    - docs/decisions/0001-block-launch-path.md
  modified:
    - package.json
    - modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockStrategyStore.kt
    - .planning/PROJECT.md
    - .planning/phases/01-foundation-block-launch-spike/SKELETON.md

key-decisions:
  - "Primary block path = activity-first, recorded in docs/decisions/0001-block-launch-path.md: 5/5 activityFirst trials confirmed on the API 36 emulator (latencies 202-691ms, all under the spec §6.4 1500ms budget), 0 BAL-block/StrictMode log lines observed. GLOBAL_ACTION_HOME + notification fallback stays wired as production code regardless (5/5 forced trials reached the launcher, posted the notification, and the tap reopened BlockActivity)."
  - "Decision scoped explicitly to the Android 16 (API 36) Medium_Phone_API_36.1 emulator image - not read as a general Android BAL exemption claim, per ARCHITECTURE.md/PITFALLS.md Pitfall 3."

patterns-established:
  - "Repeatable spike runner (scripts/spike-block-launch.sh --trials N) intended for re-use at every Phase 12 re-validation and Android release bump, not a one-off script."

requirements-completed: [FND-03]

coverage:
  - id: D1
    description: "Spike runner exercises activityFirst and homeNotification 5x each on API 36 with exemption controls, writing logcat + screenshot evidence and summary.json"
    requirement: "FND-03"
    verification:
      - kind: other
        ref: ". scripts/env.sh && bash scripts/spike-block-launch.sh --trials 5 -> SPIKE_DONE, then node summary check -> SPIKE_EVIDENCE_OK"
        status: pass
    human_judgment: true
    rationale: "must_haves requires a human to skim the trial-1/shade/tap screenshots and logcat before the decision is trusted (per the plan's <human-check>); this was done during execution and the screenshots visually confirm the block screen, the fallback notification shade, and the tap reopening BlockActivity, matching summary.json's counts exactly."
  - id: D2
    description: "Primary block path recorded as a decision derived by a pre-declared rule, machine-checked against summary.json, with production default aligned"
    requirement: "FND-03"
    verification:
      - kind: other
        ref: "node decision-check script -> DECISION_MATCHES_EVIDENCE"
        status: pass
      - kind: unit
        ref: "pnpm lint:kotlin && pnpm test:kotlin (BlockOutcomeDeciderTest, SharedVectorsLoaderTest all pass)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-28
status: complete
---

# Phase 1 Plan 7: Block-Launch Spike Runner + Primary-Path Decision Summary

**Spike runner exercised both block-launch paths 5x each on the API 36 emulator; activity-first is the recorded primary (5/5 confirmed, max latency 691ms, zero BAL-block signals), with the GLOBAL_ACTION_HOME + notification fallback proven fully working and kept wired regardless.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-28T13:53:00Z
- **Completed:** 2026-09-28T14:11:49Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- `scripts/spike-block-launch.sh --trials N`: a repeatable, non-interactive spike runner (preconditions, exemption controls, both-path cascade, summary.json emission) reusable at every Phase 12 re-validation
- Both block paths exercised 5x each on the real API 36 emulator with the 12s post-visibility grace, overlay-permission-absent assertion, and notification-tap correctly excluded from activity-path evidence
- `docs/decisions/0001-block-launch-path.md`: the primary-path decision, derived by a rule declared before the evidence existed, machine-checked against `summary.json` so the doc can never silently drift from the evidence
- `BlockStrategyStore.DEFAULT_STRATEGY` aligned to the recorded primary (`ACTIVITY_FIRST`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Spike runner exercises both block paths 5x on API 36 and writes evidence + summary.json** - `61ab3e2` (feat)
2. **Task 2: Record the primary block path as a decision, derived by rule from the evidence, and align the production default** - `f987006` (feat)

**Plan metadata:** commit pending (this docs commit)

## Files Created/Modified
- `scripts/spike-block-launch.sh` - repeatable `--trials N` spike runner: preconditions (SDK/overlay/Clock/service), `set_strategy` helper, activityFirst and homeNotification trial loops, summary.json writer
- `package.json` - added `spike:block-launch` script
- `.planning/phases/01-foundation-block-launch-spike/spike-evidence/summary.json` - machine-readable results (5/5 confirmed activityFirst, 5/5 forced homeNotification)
- `.planning/phases/01-foundation-block-launch-spike/spike-evidence/logcat-activity-first.txt` - per-trial ScreenGuard + BAL/StrictMode logcat capture
- `.planning/phases/01-foundation-block-launch-spike/spike-evidence/logcat-home-notification.txt` - per-trial fallback logcat capture
- `.planning/phases/01-foundation-block-launch-spike/spike-evidence/activity-first-trial1.png` - trial-1 screenshot showing the native block screen over Clock
- `.planning/phases/01-foundation-block-launch-spike/spike-evidence/home-notification-shade.png` - notification shade showing "Clock is blocked - Tap to see why."
- `.planning/phases/01-foundation-block-launch-spike/spike-evidence/home-notification-tap.png` - block screen reopened via the notification tap
- `docs/decisions/0001-block-launch-path.md` - the ADR: context, method, evidence table, decision rule, decision, scope, consequences, re-validation triggers
- `modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockStrategyStore.kt` - added `DEFAULT_STRATEGY` companion constant, used by `get()`
- `.planning/PROJECT.md` - Key Decisions row for the AccessibilityService enforcement decision updated with the recorded outcome
- `.planning/phases/01-foundation-block-launch-spike/SKELETON.md` - Block path Architectural Decisions row updated with the recorded primary and result numbers

## Decisions Made
- **Primary block path = activity-first** on the Android 16 (API 36) `Medium_Phone_API_36.1` emulator (build `google/sdk_gphone64_x86_64/emu64xa:16/BP41.250822.007/14042983:user/release-keys`): 5/5 `activityFirst` trials confirmed (latencies 202-691ms, all under spec §6.4's 1500ms block-latency budget), 0 BAL-block or StrictMode-blocked-launch log lines observed, and Close-app correctly returned to the launcher in all 5 trials. This consolidates the earlier single-run observation from 01-04-SUMMARY.md across a full 5-trial sample with exemption controls in place, exactly as 01-04 recommended not settling for.
- **Fallback stays production-ready regardless of the primary result**, per FND-03's explicit requirement: all 5 `homeNotification` trials forced correctly, reached the launcher, posted the `com.screenlimiter.app|4201` notification, and (trial 1) tapping it reopened `BlockActivity`.
- **Decision scoped to this exact emulator image**, not a general Android BAL-exemption claim — `docs/decisions/0001-block-launch-path.md`'s Scope section states this explicitly, and the doc never claims "BAL works" unqualified (verified by acceptance criteria grep).
- **Adb-based service enablement caveat carried forward explicitly**: `scripts/guard-service.sh enable` bypasses Android 13+ Restricted Settings, which a real sideloaded-app user would hit — flagged as a Phase 7 onboarding concern in the ADR's Method section, not silently assumed away.

## Deviations from Plan

None - plan executed exactly as written. The spike ran cleanly on the first attempt (no runner bugs needing a fix-and-rerun cycle), and the decision rule's inputs (confirmed=5, maxLatencyMs=691<1500, balBlockLogLines=0) landed cleanly on the activity-first branch with no ambiguous case to resolve.

## Issues Encountered

None. `bash scripts/run-android.sh` (rebuild with the ktlint-formatted Kotlin from Plan 01-06) and `bash scripts/e2e-skeleton.sh` both passed after the `BlockStrategyStore.DEFAULT_STRATEGY` change, confirming the strategy-restore path (`activityFirst` default) still works end to end.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FND-03 is fully satisfied: both block paths measured on API 36, the primary path is a recorded, evidence-backed decision, and the fallback is proven production-ready.
- The "[Phase 1] The BAL spike outcome decides which block strategy is primary" blocker in STATE.md is resolved as of this plan.
- Phase 2 can build enforcement directly against `BlockStrategyStore.DEFAULT_STRATEGY = ACTIVITY_FIRST` without re-deciding the primary path; Phase 7 onboarding should still request the notification permission early, since the fallback remains the path any less-favorable OEM/device will actually use.
- Plan 01-08 (the final Phase 1 plan) is next.

---
*Phase: 01-foundation-block-launch-spike*
*Completed: 2026-09-28*

## Self-Check: PASSED

All 10 created/modified files verified present on disk; both task commits (`61ab3e2`, `f987006`) verified present in git history.
