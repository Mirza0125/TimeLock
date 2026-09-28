---
phase: 01-foundation-block-launch-spike
plan: 08
subsystem: infra
tags: [docs, pnpm, expo, clean-checkout, gradle, metro]

# Dependency graph
requires:
  - phase: 01-foundation-block-launch-spike (Plan 01-01)
    provides: scaffold, run-android.sh, emu-ui.mjs, Home route text "Block strategy:"
  - phase: 01-foundation-block-launch-spike (Plan 01-02..01-06)
    provides: lint, format, typecheck, test, lint:kotlin, test:kotlin gates
  - phase: 01-foundation-block-launch-spike (Plan 01-07)
    provides: docs/decisions/0001-block-launch-path.md, spike:block-launch
provides:
  - "docs/DEVELOPMENT.md: full developer guide (prerequisites, setup, run, quality gate table, native-config rules, RTL rule, shared contract, accessibility-service dev caveats, block-launch spike re-run, troubleshooting), machine-checked against the repo (DOCS_CONSISTENT)"
  - "pnpm verify: one command running all six quality gates in sequence"
  - "scripts/verify-clean-checkout.sh + pnpm verify:clean-checkout: proves FND-01 literally from a fresh git clone of HEAD, no node_modules/, no android/"
  - "SKELETON.md finalized: real resolved versions, all 6 Stack Touched items checked, block-path decision link confirmed"
affects: [Phase 2 (SKELETON.md is the frozen architecture contract later phases build on)]

# Actuals (#2632)
actuals:
  tokens: 5838
  tasks: 2
  commits: 2
plan_head_before: d285c819e4f7a8262cc7ef3840e1f3c836d82645

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Docs-drift machine check: every `pnpm <script>` and `scripts/*` path named in docs/DEVELOPMENT.md and README.md is grepped and confirmed to exist in package.json/on disk before a plan can claim the docs are accurate"
    - "Clean-checkout proof as a repeatable script (scripts/verify-clean-checkout.sh), not a one-off manual step: clones HEAD to a fresh temp dir, builds/launches via the same documented commands a new developer would run, and always stops its own detached Metro in an EXIT trap so a failure never leaves an orphaned server corrupting the next run"

key-files:
  created:
    - docs/DEVELOPMENT.md
    - scripts/verify-clean-checkout.sh
  modified:
    - README.md
    - package.json
    - docs/decisions/0001-block-launch-path.md
    - .planning/phases/01-foundation-block-launch-spike/SKELETON.md

key-decisions:
  - "verify-clean-checkout.sh's Home-route wait budget raised from the plan's literal 120000ms to 600000ms (10 min), after two observed timeouts: the underlying native build and app install/launch succeeded well within budget both times, but the FIRST cold Metro JS-bundle transform (no prior cache, competing for CPU with this machine's live Gradle/Kotlin daemons and Android Studio) took longer than either 120s or 300s to complete."
  - "verify-clean-checkout.sh now stops its detached Metro process unconditionally in the EXIT trap, before removing the clone directory - not only on the happy path. Root-caused during this plan's own execution: when the Home-route wait step failed, `set -e` aborted the subshell before it reached its own 'stop clone's Metro' line, leaving an orphaned Metro process bound to port 8081 that kept serving the now-deleted clone's file paths to every subsequent run's `metro.sh start` (which only checks whether *something* answers on port 8081, not which project it serves) - corrupting the next attempt with a stale ConfigError that looked like a fresh failure."

requirements-completed: [FND-01, FND-04]

coverage:
  - id: D1
    description: "docs/DEVELOPMENT.md documents every prerequisite, one-time setup step, run command, quality gate, native-config rule, the shared contract, accessibility-service dev caveats (incl. Restricted Settings), and the block-launch spike re-run steps - machine-checked so it cannot name a script or pnpm command that doesn't exist"
    requirement: "FND-04"
    verification:
      - kind: other
        ref: "node docs-consistency check (matches every `pnpm <script>` and `scripts/*.{sh,mjs,txt}` reference in docs/DEVELOPMENT.md and README.md against package.json scripts and files on disk) -> DOCS_CONSISTENT"
        status: pass
      - kind: unit
        ref: "grep acceptance criteria: verify script exact string (1), README link (1), 'never' (7), 'verify:native' (3), '0001-block-launch-path' (1), 'restricted settings' (2, case-insensitive)"
        status: pass
    human_judgment: false
  - id: D2
    description: "pnpm verify runs ESLint (+ RTL self-test), Prettier check, tsc --noEmit, Jest, ktlint, and JUnit in sequence and exits 0"
    requirement: "FND-04"
    verification:
      - kind: other
        ref: ". scripts/env.sh && pnpm verify -> RTL_RULE_OK printed, SharedVectorsLoaderTest/BlockOutcomeDeciderTest JUnit PASSED lines printed, exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "From a fresh `git clone` of HEAD (no node_modules, no android/), the documented commands (pnpm install --frozen-lockfile, bash scripts/run-android.sh --clean) build and launch ScreenLimiter on emulator-5554, and the Home route renders (proven via the 'Block strategy:' text, not just a process existing)"
    requirement: "FND-01"
    verification:
      - kind: e2e
        ref: "bash scripts/verify-clean-checkout.sh (this session, after the timeout/trap fix) -> APP_RUNNING pid=6245, FOUND text:Block strategy:, Metro stopped, CLEAN_CHECKOUT_OK"
        status: pass
    human_judgment: false
  - id: D4
    description: "SKELETON.md is finalized: Finalized date set, all 6 Stack Touched items checked, Actual Resolved Versions table fully populated from node_modules/gradle build output, and the block-path decision link confirmed"
    requirement: "FND-01"
    verification:
      - kind: other
        ref: "node SKELETON finalization check (10 version rows, 0 empty, 6 checked boxes, typescript 5.9.x, 0001-block-launch-path link present) -> SKELETON_FINAL_OK"
        status: pass
    human_judgment: false

duration: 47min
completed: 2026-09-28
status: complete
---

# Phase 1 Plan 8: Developer Guide, `pnpm verify`, and Clean-Checkout Proof Summary

**docs/DEVELOPMENT.md is a machine-checked developer guide, `pnpm verify` aggregates all six quality gates into one command, and `scripts/verify-clean-checkout.sh` proves FND-01 literally by cloning HEAD into a fresh temp directory and confirming the Home route renders on the emulator — with SKELETON.md now finalized as Phase 2's frozen architecture contract.**

## Performance

- **Duration:** 47 min (19:14:43 -> 20:01:28 +05:00)
- **Started:** 2026-09-28T14:14:43Z
- **Completed:** 2026-09-28T15:01:28Z
- **Tasks:** 2 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `docs/DEVELOPMENT.md`: prerequisites, one-time setup, run commands, a quality-gate table, native-config rules (android/ generated/never edited), the RTL style rule, the shared TS/JSON/Kotlin contract, accessibility-service dev caveats (Restricted Settings), block-launch spike re-run instructions, and troubleshooting — every command and script path in it, and in README.md, is grepped against the real repo and confirmed to exist (`DOCS_CONSISTENT`).
- `package.json` `verify` script chains all six quality gates (`lint`, `format:check`, `typecheck`, `test`, `lint:kotlin`, `test:kotlin`) into one command; `pnpm verify` passes end to end, printing `RTL_RULE_OK` and the JUnit `PASSED` lines.
- `scripts/verify-clean-checkout.sh` (+ `pnpm verify:clean-checkout`) clones HEAD into a fresh temp directory, asserts no `node_modules/`/`android/` exist yet, installs with `--frozen-lockfile`, builds and launches via the same documented `bash scripts/run-android.sh --clean`, and waits for the real Home-route text (`Block strategy:`) via `scripts/emu-ui.mjs` before printing `CLEAN_CHECKOUT_OK` — a process-existing check alone would not have proven the JS layer actually loaded.
- `SKELETON.md` is finalized: today's date, all 6 Stack Touched items checked with their proving plan, and the Actual Resolved Versions table filled in from `node_modules` and this session's Gradle build output (expo 57.0.25, react-native 0.86.3, typescript 5.9.3, expo-router 57.0.23, jest-expo 57.0.5/jest 29.7.0, eslint 9.39.5/eslint-config-expo 57.0.2/prettier 3.9.9, Gradle 9.3.1, AGP 8.12.0, Kotlin 2.1.20, SDK 36/36/24).

## Task Commits

Each task was committed atomically:

1. **Task 1: Documented command set + `pnpm verify`** - `9b67ec9` (feat)
2. **Task 2: FND-01 proven from a fresh clone; SKELETON.md finalized** - `30c653d` (feat)

**Plan metadata:** pending (this docs commit).

## Files Created/Modified

- `docs/DEVELOPMENT.md` - full developer guide, machine-checked against the repo
- `scripts/verify-clean-checkout.sh` - clean-checkout proof script; always stops its detached Metro on exit, whether it succeeds or fails
- `README.md` - links `docs/DEVELOPMENT.md` from the quick start
- `package.json` - adds `verify` and `verify:clean-checkout` scripts
- `docs/decisions/0001-block-launch-path.md` - reformatted by `pnpm format` (table alignment + prose wrap only, no content change; this file is not in the plan's `files_modified` list but was touched as an incidental, harmless side effect of the plan's own instructed repo-wide `pnpm format` step)
- `.planning/phases/01-foundation-block-launch-spike/SKELETON.md` - finalized (date, checked stack items, resolved versions table)

## Decisions Made

- Raised `verify-clean-checkout.sh`'s Home-route wait from the plan's literal `120000` to `600000` ms after two real timeouts on this machine (see Deviations) — the native build itself never exceeded ~1m10s; only the first, cold Metro JS-bundle transform (competing with this session's live Gradle/Kotlin daemons and Android Studio for CPU) needed more wall-clock time than either 120s or 300s provided.
- Moved the clone's Metro-stop call into the script's `EXIT` trap, unconditional on success/failure, so a failed run can never leave an orphaned Metro bound to port 8081 serving a deleted project's paths to the next run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `verify-clean-checkout.sh`'s 120000ms Home-route wait timed out on this machine, even though the underlying build succeeded**
- **Found during:** Task 2, first `bash scripts/verify-clean-checkout.sh` run (literal plan value)
- **Issue:** The script cloned, installed, prebuilt, built, and launched the app successfully (confirmed via `adb shell pidof` showing a running process), but `node scripts/emu-ui.mjs wait "text:Block strategy:" 120000` timed out before the app's first, cold Metro JS-bundle transform completed under this machine's concurrent CPU load (live Gradle daemon, Kotlin compile daemon, and Android Studio all running from earlier plans in this session).
- **Fix:** Raised the wait to `300000`ms first (still timed out), then to `600000`ms (succeeded, `FOUND text:Block strategy:` printed within budget).
- **Files modified:** scripts/verify-clean-checkout.sh
- **Verification:** `bash scripts/verify-clean-checkout.sh` printed `CLEAN_CHECKOUT_OK` on the third attempt
- **Committed in:** `30c653d`

**2. [Rule 1 - Bug] Failed clean-checkout run left an orphaned Metro process serving a deleted clone's file paths to the next run**
- **Found during:** Task 2, diagnosing the second timeout
- **Issue:** `verify-clean-checkout.sh` only stopped its clone's detached Metro process on the happy path (the last line of the clone subshell, after the Home-route wait succeeded). When the wait timed out, `set -e` aborted the subshell before reaching that line, so the `EXIT` trap only removed the clone directory — the orphaned, `setsid`-detached Metro process kept running, still bound to port 8081. The *next* invocation's `scripts/metro.sh start` checks only whether *something* answers on port 8081 (`curl .../status`), not which project it serves, so it silently reused the stale, orphaned Metro pointing at the already-deleted clone path. Every subsequent bundle request then failed with a `ConfigError: ... package.json does not exist` that looked like a fresh, unrelated failure.
- **Fix:** Moved the Metro-stop call into the script's `cleanup()` function (called from the top-level `EXIT` trap), so it always runs — on success, on a failed build, or on a failed Home-route wait — and always runs *before* the clone directory is removed.
- **Files modified:** scripts/verify-clean-checkout.sh
- **Verification:** Manually killed the stray orphaned Metro and confirmed port 8081 was free; re-ran `bash scripts/verify-clean-checkout.sh` end to end with the fix in place, confirmed `Metro stopped` printed inside the clone subshell before `CLEAN_CHECKOUT_OK`, and confirmed no stray `expo start`/temp-clone directories remained afterward
- **Committed in:** `30c653d`

**3. [Incidental, not a fix] `pnpm format` (Task 1's own instructed step) reformatted `docs/decisions/0001-block-launch-path.md`**
- **Found during:** Task 1, running the plan's own instructed `pnpm format` step
- **Issue:** `pnpm format` runs Prettier across the whole repo, not scoped to the files this plan touches. It re-wrapped a couple of prose lines and realigned a Markdown table in the Plan 01-07 decision doc.
- **Fix:** None needed — table alignment and prose-wrap only, no content or meaning change. Included in the Task 1 commit since it was a direct, expected side effect of the plan's own instruction to run `pnpm format`.
- **Files modified:** docs/decisions/0001-block-launch-path.md
- **Verification:** `git diff` reviewed line by line; `pnpm format:check` passes
- **Committed in:** `9b67ec9`

---

**Total deviations:** 3 (1 blocking-issue timeout fix, 1 bug fix, 1 incidental formatting side effect)
**Impact on plan:** All three were necessary for the plan's own verification commands to pass as written, or were a directly instructed side effect. No scope creep, no architecture change. The Metro-orphan bug (#2) is a durable fix — it makes `verify-clean-checkout.sh` safe to re-run repeatedly (Phase 12 re-validation, CI) without manual cleanup between attempts.

## Issues Encountered

- This dev machine had several long-lived, CPU-heavy processes from earlier plans in this session (a live Gradle daemon, a Kotlin compile daemon, and Android Studio) running concurrently with the clean-checkout build, which is the direct cause of Deviation #1's timeout. This is machine-specific load, not a defect in the documented commands themselves — flagged here for anyone re-running this script on a busier machine.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FND-01 and FND-04 are both fully satisfied for Phase 1: the documented command set is complete, machine-checked, and proven end to end from a real fresh clone; `pnpm verify` is the one-command gate for all six quality tools.
- `SKELETON.md` is finalized and ready to serve as Phase 2's architecture contract — real versions, every Stack Touched item checked, the block-path decision linked.
- Phase 1 (all 8 plans) is complete. No blockers carried forward beyond the pre-existing STATE.md items (Play developer account type decision, Phase 3+ real-device smoke pass, Phase 8 widget engine spike, and the still-undecided app/store name and monetization model) — none of which are Phase 1 scope.

---
*Phase: 01-foundation-block-launch-spike*
*Completed: 2026-09-28*

## Self-Check: PASSED

- FOUND: docs/DEVELOPMENT.md
- FOUND: scripts/verify-clean-checkout.sh
- FOUND: commit 9b67ec9
- FOUND: commit 30c653d
- CLEAN_CHECKOUT_OK confirmed in this session's verification log
- SKELETON_FINAL_OK confirmed
- DOCS_CONSISTENT confirmed
- `pnpm verify` confirmed exit 0 with RTL_RULE_OK and JUnit PASSED lines present
