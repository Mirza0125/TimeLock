---
phase: 01-foundation-block-launch-spike
plan: 03
subsystem: contracts
tags: [typescript, contract, domain-model, test-vectors, jest, fnd-05]

# Dependency graph
requires:
  - phase: 01-foundation-block-launch-spike
    provides: "Expo SDK 57 scaffold, modules/screen-guard local Expo Module, Jest/ESLint/Prettier/tsc quality gates (01-01, 01-02)"
provides:
  - "Frozen ScreenGuard TS contract (modules/screen-guard/src/ScreenGuard.types.ts): AppRef, Capabilities, PermissionState, the 5-member Rule union, RuleEvaluationInput, ScreenGuardApi (12 methods)"
  - "21 shared JSON rule-evaluation vectors (modules/screen-guard/shared-test-vectors/rule-evaluation.json, schemaVersion 1) encoding spec §6.3 evaluation order"
  - "ruleEvaluationVectors.ts: typed vector shapes + parseRuleEvaluationVectorFile runtime validator (no evaluator)"
affects: ["01-06", "phase-2-mvp-slice", "phase-4-enforcement-breadth"]

# Actuals (#2632) — chars/4 over the realized diff
actuals:
  tokens: 18900
  tasks: 2
  commits: 2
  plan_head_before: de9c3bf5bf42dbe4dcc562673fc963a0ffbff2f0

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Contract-first, evaluator-last: ScreenGuard.types.ts and the shared rule-evaluation vectors exist before any TS or Kotlin evaluator, so both future evaluators are built and cross-checked against the same fixture (FND-05 ordering)"
    - "Hand-written runtime schema validator (parseRuleEvaluationVectorFile) instead of a dependency (zod arrives later with the domain layer) — throws an Error naming the offending vector id and field for every structural/consistency violation"
    - "satisfies ScreenGuardApi + exhaustive switch(rule.type) + @ts-expect-error as compile-time proofs that a contract is both implementable and safely narrowable, checked in a dedicated __tests__/screenGuardContract.test.ts rather than only informally reviewed"

key-files:
  created:
    - modules/screen-guard/src/ruleEvaluationVectors.ts
    - modules/screen-guard/shared-test-vectors/rule-evaluation.json
    - __tests__/screenGuardContract.test.ts
    - __tests__/sharedVectors.test.ts
  modified:
    - modules/screen-guard/src/ScreenGuard.types.ts

key-decisions:
  - "modules/screen-guard/index.ts already re-exported every type via `export * from './src/ScreenGuard.types'` (from Plan 01-01's placeholder barrel) — no change was needed to satisfy the 'barrel re-exports every contract type' requirement, and the vector parser was simply never added to it, satisfying the 'parser stays out of the app bundle' prohibition without any extra work."
  - "Tag/BlockReason coverage checks (every REQUIRED_VECTOR_TAGS entry and every BlockReason appears at least once) were implemented as parser-level invariants, not just test-only assertions on the real file, matching the plan's threat register (T-01-07) which names 'tag coverage' as something parseRuleEvaluationVectorFile enforces. This is additive to the explicit per-vector throw list in the plan's behavior block and does not conflict with it or with the 'corrupt one field at a time' negative tests, since none of those mutations remove tag/reason coverage from the file."
  - "block-child-grant-never-overrides-schedule is encoded as specRef '§6.3 step 2' (schedule), not step 6 (grant) — because the evaluation order means an active grant is never even consulted once a schedule block already fires at step 2, in either self or child mode. This matches the plan's own vector description ('a grant never overrides a schedule') and is distinct from the explicitly NOT-encoded open question (c) about self-mode grant-vs-schedule precedence, which this vector does not attempt to resolve."

patterns-established:
  - "Pattern: any change to ScreenGuard.types.ts must update the Kotlin mirror, the shared vectors, and the iOS module plan in the same change (stated in the file's own FROZEN header comment) — a discoverable, not just documented-elsewhere, convention for future phases touching this file."

requirements-completed: [FND-05]

coverage:
  - id: D1
    description: "modules/screen-guard/src/ScreenGuard.types.ts exports the frozen ScreenGuard contract (Platform, AppRef, AppCategory, InstalledApp, Capabilities, Status, PermissionState, Weekday, DateRange, UsageDay, Mode, FrictionCfg, RuleType, RuleBase, DailyRule, GroupRule, ScheduleRule, SessionRule, OpenCountRule, Rule, Grant, BlockReason, RuleDecision, RuleEvaluationInput, LiveStatus, ScreenGuardEventMap, Subscription, ScreenGuardApi); a fake object satisfies ScreenGuardApi with exactly its 12 §12.2 methods, each Rule subtype literal narrows exhaustively via switch(rule.type), and a block RuleDecision without untilMs fails to compile"
    requirement: "FND-05"
    verification:
      - kind: unit
        ref: "__tests__/screenGuardContract.test.ts (9 tests: satisfies check, 12-method check, 5 exhaustive-narrowing cases, valid + @ts-expect-error block decision)"
        status: pass
      - kind: other
        ref: "pnpm typecheck (tsc --noEmit, whole project, exit 0 — includes the @ts-expect-error assertion)"
        status: pass
    human_judgment: false
  - id: D2
    description: "modules/screen-guard/shared-test-vectors/rule-evaluation.json holds 21 unique-id vectors (schemaVersion 1) covering every §6.3 evaluation step tag and every BlockReason, loaded and validated by parseRuleEvaluationVectorFile in Jest; no evaluator (TS or Kotlin) exists yet"
    requirement: "FND-05"
    verification:
      - kind: unit
        ref: "__tests__/sharedVectors.test.ts (15 tests: real-file load/count/tag-coverage/reason-coverage/epoch-ISO checks, plus 10 negative cases corrupting one field at a time)"
        status: pass
      - kind: other
        ref: "node -e vectors-count/schemaVersion/unique-id check -> VECTORS_OK; find/grep checks confirm no LimitEngine*/evaluate export exists and index.ts does not export the parser"
        status: pass
    human_judgment: false

# Metrics
duration: ~12min
completed: 2026-09-28
status: complete
---

# Phase 1 Plan 3: Frozen ScreenGuard Contract & Shared Rule-Evaluation Vectors Summary

**The cross-platform `ScreenGuardApi` contract (spec §12.2/§16.1) is frozen and proven implementable at compile time, and 21 shared JSON vectors encoding every §6.3 evaluation step exist and validate in Jest via a hand-written runtime parser — before any TS or Kotlin rule evaluator is written.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-28T12:11:46Z
- **Completed:** 2026-09-28T12:23:14Z
- **Tasks:** 2
- **Files modified:** 5 (1 modified, 4 created)

## Accomplishments

- Replaced the Plan 01-01 placeholder in `ScreenGuard.types.ts` with the full frozen contract: `AppRef`, `InstalledApp`, `Capabilities`, `PermissionState`, the full §16.1 domain (`Weekday`, `DateRange`, `AppUsage`/`UsageDay`, `Mode`/`EnforcementMode`, `RuleSource`, `FrictionKind`/`FrictionCfg`, the 5-member `Rule` discriminated union with `ScheduleWindow`, `Grant`), the evaluation I/O (`BlockReason`, `RuleDecision`, `AppUsageToday`, `RuleEvaluationInput`), and `ScreenGuardApi` (12 methods, generic `addListener`) — documented FROZEN with a header stating any change must update the Kotlin mirror, shared vectors, and iOS plan together
- `__tests__/screenGuardContract.test.ts` proves the contract is implementable: a `jest.fn()`-backed fake `satisfies ScreenGuardApi` with exactly the 12 §12.2 methods; one literal of each `Rule` subtype narrows exhaustively through `switch (rule.type)`; a `@ts-expect-error` proves a block `RuleDecision` without `untilMs` fails to compile
- `ruleEvaluationVectors.ts`: `RuleEvaluationVector`/`RuleEvaluationVectorFile` types, `REQUIRED_VECTOR_TAGS` (20 tags), and `parseRuleEvaluationVectorFile` — a dependency-free runtime validator that throws an `Error` naming the offending vector id and field for duplicate ids, wrong `schemaVersion`, unknown rule types, incomplete block decisions, `nowIso`/`nowMs` mismatches, missing/mismatched `expectedUntilIso`, an `allow` carrying `expectedUntilIso`, malformed `AppRef`s, and missing tag/`BlockReason` coverage
- `rule-evaluation.json`: 21 hand-authored vectors, one or more per §6.3 evaluation step (allowlist; daily under/at-limit/disabled/inactive-weekday/per-weekday-override; group; schedule inside/outside/crossing-midnight-both-sides/allowlisted-app; open-count at-boundary/exceeded; session at-boundary/reached; grant-suppresses/grant-expires-at-now/child-grant-never-overrides-schedule; schedule-precedes-daily) — all cross-checked with `Date.parse` for every `nowIso`/`expectedUntilIso` pair
- `__tests__/sharedVectors.test.ts`: loads and validates the real file (21 unique ids, full tag/reason coverage, epoch/ISO consistency) plus 10 negative tests, each built by cloning the parsed file and corrupting exactly one field

## Task Commits

Each task was committed atomically:

1. **Task 1: Freeze the ScreenGuard contract — typed, exported, and proven implementable** — `32628d6` (feat)
2. **Task 2: Shared rule-evaluation vectors — 21 vectors encoding spec §6.3, loaded and validated in Jest** — `94e709c` (feat)

**Plan metadata:** committed together with STATE.md/ROADMAP.md update (see final commit below).

## Files Created/Modified

- `modules/screen-guard/src/ScreenGuard.types.ts` — full frozen contract replacing the Plan 01-01 placeholder
- `__tests__/screenGuardContract.test.ts` — compile-time + runtime conformance checks (9 tests)
- `modules/screen-guard/src/ruleEvaluationVectors.ts` — vector types + `parseRuleEvaluationVectorFile`
- `modules/screen-guard/shared-test-vectors/rule-evaluation.json` — 21 vectors, `schemaVersion: 1`
- `__tests__/sharedVectors.test.ts` — Jest loader/validator for the shared vectors (15 tests)

## Decisions Made

- `modules/screen-guard/index.ts` needed no change: it already did `export * from './src/ScreenGuard.types'` from the Plan 01-01 placeholder barrel, which already satisfies "the barrel re-exports every contract type," and the vector parser was simply never added there, satisfying "the parser is not in the app bundle barrel" without any extra step.
- Implemented tag/`BlockReason` coverage checks as parser-level invariants (thrown from `parseRuleEvaluationVectorFile` itself), not only as test-only assertions on the real file — this matches the plan's threat register (T-01-07), which explicitly names "tag coverage" as something the parser enforces, and does not conflict with the plan's per-vector throw list or the "corrupt one field at a time" negative tests.
- `block-child-grant-never-overrides-schedule` is tagged `specRef: "§6.3 step 2"` (schedule), not step 6 (grant), because the schedule block fires before grant suppression is ever consulted, in both self and child mode — this vector demonstrates evaluation order, not a resolution of the explicitly-deferred self-mode grant-vs-schedule question (Flagged Assumption 3c below).

## Deviations from Plan

None - plan executed exactly as written. No package installs, no architectural changes, no scope adjustments were needed; both tasks passed `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm format:check` on the first implementation pass (Prettier reformatting was applied once per task, as expected for hand-written files, and re-verified after).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FND-05's TS half is complete: the frozen `ScreenGuard.types.ts` contract and the 21 shared rule-evaluation vectors exist and validate before either the Phase 2/4 TS reference evaluator or the Kotlin `LimitEngine` (Plan 01-06 adds the JUnit loader for the same JSON file) is written.
- No evaluator exists yet, confirmed by the plan's own acceptance-criteria `find`/`grep` checks — Phase 2/4 planning must write the first evaluator against these vectors, not before them.
- **Flagged Assumptions to confirm/revise in Phase 2/4 planning** (copied verbatim from the plan's "Flagged Assumptions" section):
  1. **Open-count semantics.** `usageToday.opens` includes the current open, and the rule blocks when opens > maxOpens. This follows "Opening beyond max → blocked" and ROADMAP P4 SC3 "after the Nth open". Encoded in two vectors.
  2. **Grant expiry boundary.** A grant is active while nowMs < until, so at exactly `until` it has expired. Encoded in one vector.
  3. **NOT encoded (ambiguous — open questions for Phases 2 and 4):**
     - (a) When a schedule and a daily limit both block with different `until` values, which reason and `until` the block screen reports ("most restrictive" versus the ordered steps). Only the case where both readings agree is encoded.
     - (b) How usage of a category-based group is summed (it depends on installed-app categories).
     - (c) Whether a grant can override a schedule in self mode. Step 6 lists only reasons 3–5; the parenthetical mentions child mode.
- No blockers.

---
*Phase: 01-foundation-block-launch-spike*
*Completed: 2026-09-28*

## Self-Check: PASSED

All 6 files confirmed present on disk (`ScreenGuard.types.ts`, `ruleEvaluationVectors.ts`, `rule-evaluation.json`, `screenGuardContract.test.ts`, `sharedVectors.test.ts`, this SUMMARY). Both task commits (`32628d6`, `94e709c`) confirmed present in `git log`.
