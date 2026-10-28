---
phase: "1"
slug: "foundation-block-launch-spike"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-25"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest via `jest-expo` >=57.0.5 (TS); JUnit via Gradle (Kotlin, local Expo module `screen-guard`); ktlint Gradle plugin `org.jlleitschuh.gradle.ktlint` 14.2.0 |
| **Config file** | none — Wave 0 installs `jest.config.js`, `eslint.config.js`, Prettier config, module ktlint block |
| **Quick run command** | `pnpm test` (JS) / `pnpm test:kotlin` (Kotlin → `scripts/gradle.sh :screen-guard:testDebugUnitTest`; module path confirmed in Plan 01-06) — run after `. scripts/env.sh` |
| **Full suite command** | `pnpm verify` (= lint + format:check + typecheck + test + lint:kotlin + test:kotlin); native config: `pnpm verify:native` |
| **Estimated runtime** | ~180 seconds (Gradle-dominated) |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the area just touched (e.g. `pnpm lint` after ESLint config, `npx expo prebuild --clean --platform android` after config-plugin changes)
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green AND the FND-03 spike result recorded as a decision
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | FND-01 | T-01-SC | Nothing installed before blocking-human legitimacy approval | checkpoint | — (blocking-human) | n/a | ⬜ pending |
| 01-01-T2 | 01-01 | 1 | FND-01 | T-01-01, T-01-02 | setBlockStrategy allowlist-validated; prefs MODE_PRIVATE | smoke (tracer) | `bash scripts/run-android.sh --clean` + logcat `getBlockStrategy -> …` | ❌ W0 (created by task) | ⬜ pending |
| 01-01-T3 | 01-01 | 1 | FND-01 | — | N/A | e2e | `bash scripts/e2e-skeleton.sh` → E2E_SKELETON_OK | ❌ W0 (created by task) | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | FND-04 | T-01-05 | Lint gate self-tests the RTL rule | lint | `pnpm format:check && pnpm lint` → RTL_RULE_OK | ❌ W0 | ⬜ pending |
| 01-02-T2 | 01-02 | 2 | FND-04 | T-01-05 | No pass-with-no-tests | unit | `pnpm typecheck && pnpm test` | ❌ W0 | ⬜ pending |
| 01-03-T1 | 01-03 | 3 | FND-05 | — | N/A | unit/type | `pnpm typecheck && pnpm exec jest __tests__/screenGuardContract.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-T2 | 01-03 | 3 | FND-05 | T-01-07 | Vector parser enforces consistency | unit | `pnpm exec jest __tests__/sharedVectors.test.ts` + VECTORS_OK | ❌ W0 | ⬜ pending |
| 01-04-T1 | 01-04 | 4 | FND-02, FND-03 | T-01-09, T-01-11 | BIND_ACCESSIBILITY_SERVICE; canRetrieveWindowContent=false; no other pkg logged | smoke (tracer) | `run-android.sh --clean` + manifest/XML greps + `guard-service.sh enable` + Clock → BLOCK_ATTEMPT | ❌ W0 | ⬜ pending |
| 01-04-T2 | 01-04 | 4 | FND-03 | T-01-12, T-01-13 | BlockActivity exported=false; PendingIntent immutable; debounce | e2e/logcat | forced fallback (launcher + notification 4201), cascade (exactly 1 BLOCK_OUTCOME), off (BLOCK_SKIPPED) | ❌ W0 | ⬜ pending |
| 01-05-T1 | 01-05 | 5 | FND-02 | T-01-15, T-01-16 | Deterministic, idempotent CNG; android/ untracked | smoke/diff | `bash scripts/verify-native-config.sh` → REPRO_CLEAN_OK, REPRO_IDEMPOTENT_OK, NATIVE_CONFIG_OK | ❌ W0 | ⬜ pending |
| 01-05-T2 | 01-05 | 5 | FND-02 | T-01-10 | APK denylist (overlay, all-packages query, …) + reviewed allowlist; SDK 24/36/36 | audit | `bash scripts/audit-apk-manifest.sh` → APK_AUDIT_OK + GATE_TEETH_OK | ❌ W0 | ⬜ pending |
| 01-06-T1 | 01-06 | 6 | FND-04 | T-01-18 | ktlint has teeth; no baseline | lint | `pnpm lint:kotlin` + KTLINT_TEETH_OK probe | ❌ W0 | ⬜ pending |
| 01-06-T2 | 01-06 | 6 | FND-04, FND-05 | T-01-17 | Test-only deps pinned | unit (JUnit) | `pnpm test:kotlin` → SharedVectorsLoaderTest + BlockOutcomeDeciderTest PASSED | ❌ W0 | ⬜ pending |
| 01-07-T1 | 01-07 | 7 | FND-03 | T-01-20, T-01-21 | Overlay not declared/allowed; 12 s grace per trial | e2e + manual review | `bash scripts/spike-block-launch.sh --trials 5` → SPIKE_DONE + SPIKE_EVIDENCE_OK | ❌ W0 | ⬜ pending |
| 01-07-T2 | 01-07 | 7 | FND-03 | T-01-19 | Decision re-derived from evidence | consistency | node check → DECISION_MATCHES_EVIDENCE | ❌ W0 | ⬜ pending |
| 01-08-T1 | 01-08 | 8 | FND-01, FND-04 | T-01-23 | Docs cannot name non-existent commands | lint/unit/docs | `pnpm verify` + DOCS_CONSISTENT | ❌ W0 | ⬜ pending |
| 01-08-T2 | 01-08 | 8 | FND-01 | — | N/A | e2e (clean clone) | `bash scripts/verify-clean-checkout.sh` → CLEAN_CHECKOUT_OK + SKELETON_FINAL_OK | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are filled in by the planner/executor once PLAN.md files exist.*

---

## Wave 0 Requirements

- [ ] `jest.config.js` — `preset: 'jest-expo'`
- [ ] `eslint.config.js` — `eslint-config-expo/flat` + no-left/right style rule
- [ ] Prettier config (`.prettierrc` or `package.json#prettier`)
- [ ] `modules/screen-guard/shared-test-vectors/rule-evaluation.json` — 21 vectors covering every §6.3 step (Plan 01-03), loaded by Jest and JUnit
- [ ] `modules/screen-guard/android/build.gradle` ktlint plugin block (14.2.0)
- [ ] Framework install: `npx expo install jest-expo jest @types/jest eslint-config-expo`; `pnpm add -D @testing-library/react-native test-renderer eslint@^9.39.5 prettier@^3.9.9 typescript@~5.9.3` (ESLint 9, not 10: eslint-plugin-react peer caps at ^9.7)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Which block path is primary on API 36 (direct Activity launch vs GLOBAL_ACTION_HOME + notification) | FND-03 | The outcome is an observed platform behavior that must be judged and recorded as a decision, not a pass/fail assertion | Enable service via adb, open the designated test app (e.g. `com.google.android.deskclock`), capture `adb logcat` + screenshot/screenrecord, confirm which path interrupted the app, record decision in STATE.md / phase SUMMARY |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
