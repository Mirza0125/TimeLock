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
| **Quick run command** | `pnpm jest` (JS) / `cd android && ./gradlew :screen-guard:test` (Kotlin; exact module path confirmed after first prebuild) |
| **Full suite command** | `pnpm lint && pnpm format:check && pnpm tsc --noEmit && pnpm jest && (cd android && ./gradlew ktlintCheck test)` |
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
| 1-TBD | TBD | 1 | FND-01 | — | N/A | smoke | `npx expo run:android --device emulator-5554` + `adb shell pidof <package>` non-empty | ❌ W0 | ⬜ pending |
| 1-TBD | TBD | TBD | FND-02 | T-1-02 | Manifest limited to spec §13.2 entries (no QUERY_ALL_PACKAGES / SYSTEM_ALERT_WINDOW) | smoke/diff | `npx expo prebuild --clean --platform android` then diff/grep generated manifest | ❌ W0 | ⬜ pending |
| 1-TBD | TBD | TBD | FND-03 | T-1-01, T-1-03 | Service bound only via BIND_ACCESSIBILITY_SERVICE; canRetrieveWindowContent=false | manual + logcat | `adb shell settings put secure enabled_accessibility_services ...` then `adb shell am start` test app + `adb logcat` capture | ❌ W0 | ⬜ pending |
| 1-TBD | TBD | TBD | FND-04 | — | N/A | lint/unit | `pnpm lint`, `pnpm format:check`, `pnpm tsc --noEmit`, `pnpm jest`, `cd android && ./gradlew ktlintCheck test` | ❌ W0 | ⬜ pending |
| 1-TBD | TBD | TBD | FND-05 | — | N/A | unit | `pnpm jest sharedVectors` + `cd android && ./gradlew :screen-guard:test --tests "*SharedVectorsLoaderTest*"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are filled in by the planner/executor once PLAN.md files exist.*

---

## Wave 0 Requirements

- [ ] `jest.config.js` — `preset: 'jest-expo'`
- [ ] `eslint.config.js` — `eslint-config-expo/flat` + no-left/right style rule
- [ ] Prettier config (`.prettierrc` or `package.json#prettier`)
- [ ] `modules/screen-guard/shared-test-vectors/rule-evaluation.json` — minimal 1–2 vector stub
- [ ] `modules/screen-guard/android/build.gradle` ktlint plugin block (14.2.0)
- [ ] Framework install: `npx expo install jest-expo jest`; `pnpm add -D @testing-library/react-native eslint eslint-config-expo prettier typescript@~5.9.3`

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
