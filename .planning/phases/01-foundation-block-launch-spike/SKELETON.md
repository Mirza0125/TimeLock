# Walking Skeleton — ScreenLimiter

**Phase:** 1
**Generated:** 2026-09-25
**Finalized:** 2026-09-28

## Capability Proven End-to-End

On the API 36 emulator (AVD `Medium_Phone_API_36.1` / `emulator-5554`), a developer builds ScreenLimiter from documented commands, sets the block strategy on the Home route (JS → `ScreenGuard` Kotlin module → value persisted natively and read back after a restart), and opening the designated test app (Clock) is interrupted by the config-plugin-declared accessibility service — through the native block Activity or the `GLOBAL_ACTION_HOME` + notification fallback, whichever the Phase 1 spike records as primary.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Expo SDK 57 (`expo@~57.0.25`, React Native 0.86.3, React 19.2, Hermes, New Architecture — mandatory since SDK 55), Continuous Native Generation via `expo prebuild` | Current stable SDK; Expo Modules API is the only native-module path under the New Architecture; config plugins keep native config reproducible (FND-01, FND-02) |
| Language / types | TypeScript `~5.9.3`, `strict: true`, extends `expo/tsconfig.base` | FND-01 fixes ~5.9. The SDK 57 template ships `~6.0.3`; TS 7 breaks `app.config.ts` and is prohibited |
| Routing | Expo Router, file routes under `app/` (`app/_layout.tsx`, `app/index.tsx`) | Matches spec §9/§12.1 layout so later UI phases add routes without restructuring |
| Native layer | Local Expo Module `modules/screen-guard` (Kotlin, package `expo.modules.screenguard`), Android only in v1; iOS added in v2.0 via `create-expo-module add-platform-support` | Spec §12.1 repo layout; one typed contract per platform; shared TS never branches on platform |
| Native config | Expo config plugins in `plugins/` (CommonJS JS, `require('expo/config-plugins')`) + `app.json` `android.permissions` / `android.blockedPermissions` | FND-02: manifest entries, accessibility XML, `<queries>`, permissions all generated |
| `android/` directory | **Generated and gitignored** (Expo CNG default, template `.gitignore` `/android`). Never edited by hand; `scripts/verify-native-config.sh` proves `prebuild --clean` is byte-reproducible and idempotent | Hand edits are structurally impossible to keep — the next `--clean` wipes them. The research note suggesting a committed `android/` is overridden by this decision |
| Enforcement contract | `modules/screen-guard/src/ScreenGuard.types.ts` (frozen, FND-05) + `modules/screen-guard/shared-test-vectors/rule-evaluation.json` loaded by Jest **and** JUnit | Kotlin `LimitEngine` and the TS reference evaluator (Phase 2/4) are both written against the same vectors |
| Block path | `BlockLauncher` with `BlockStrategy` = `off` / `activityFirst` / `homeNotification`; `activityFirst` confirms the block Activity resumed within 800 ms, otherwise falls back to `GLOBAL_ACTION_HOME` + heads-up notification. **Primary path: activity-first** (5/5 confirmed, max latency 691 ms, 0 BAL-block lines on the API 36 emulator) — recorded in `docs/decisions/0001-block-launch-path.md` | The BAL exemption is not a documented Android guarantee, only measured on this emulator; the fallback is a first-class path, never an appendage, and stays wired regardless (assumption-delta decision: promote) |
| Data layer | Phase 1: `SharedPreferences` file `screen_guard` (spike settings only). Phase 2+: Room 2.8.x for rules/grants/usage (ENF-07); MMKV for UI prefs (Phase 6) | Room is additive: it replaces no Phase 1 API surface |
| Auth | None in Phase 1. Firebase Auth (incl. Anonymous) from Phase 9 | No cloud surface until parental phases |
| Deployment target | Local debug build installed on the emulator via `bash scripts/run-android.sh` (non-interactive) or `pnpm android` (interactive). No EAS / cloud build | Free-only constraint; no paid service |
| Package manager | pnpm via corepack (`packageManager` field), `.npmrc` `node-linker=hoisted` | Spec §21; hoisted layout keeps RN Gradle autolinking (`node --print require.resolve(...)`) predictable |
| Environment | `scripts/env.sh` (nvm Node 24, `JAVA_HOME=~/.local/jdk/jdk-17`, `ANDROID_HOME=~/Android/Sdk`, `ANDROID_SERIAL=emulator-5554`) | No sudo; every script and doc command sources it |
| Quality gates | ESLint 9 flat config (`eslint-config-expo/flat` + RTL no-left/right rule, self-tested), Prettier 3, `tsc --noEmit`, Jest (`jest-expo` ≥57.0.5 + RNTL 14), ktlint (Gradle plugin `org.jlleitschuh.gradle.ktlint` 14.2.0), JUnit 4.13.2 — one `pnpm` command each, `pnpm verify` runs all | FND-04 |
| E2E harness | `scripts/emu-ui.mjs` (uiautomator dump + tap by testID/text) + shell E2E scripts; Maestro deferred to its planned phase | Zero new dependencies; drives the real app on the emulator |

## Directory Layout (Phase 1)

```
app/                          Expo Router routes (_layout.tsx, index.tsx = spike console Home)
modules/screen-guard/
  index.ts                    barrel: ScreenGuard native module + types
  src/ScreenGuard.types.ts    FROZEN contract (AppRef, Capabilities, PermissionState, Rule*, ScreenGuardApi)
  src/ruleEvaluationVectors.ts  vector file types + runtime parser (no evaluator)
  src/blockStrategy.ts        spike BlockStrategy type/guard
  src/ScreenGuardModule.ts    requireNativeModule('ScreenGuard') binding
  shared-test-vectors/rule-evaluation.json
  android/src/main/java/expo/modules/screenguard/  Kotlin (module, store, service, block activity, launcher, decider)
  android/src/test/java/expo/modules/screenguard/  JUnit
plugins/withScreenGuardAndroid.js   the only source of native Android config
scripts/                      env.sh, metro.sh, run-android.sh, gradle.sh, guard-service.sh, emu-ui.mjs, e2e/spike/verify scripts
__tests__/                    Jest tests (outside app/ so Expo Router never treats them as routes)
docs/DEVELOPMENT.md           documented commands (FND-01); docs/decisions/0001-block-launch-path.md
android/                      GENERATED, gitignored, never edited
```

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner) — Plans 01-01, 01-02, 01-06
- [x] Routing — at least one real route (`app/index.tsx`) — Plan 01-01
- [x] Persistence — one real native read AND one real native write (`BlockStrategyStore` get/set, survives force-stop) — Plan 01-01
- [x] UI — interactive element wired to native (strategy buttons → `setBlockStrategy` → read-back) — Plan 01-01
- [x] Enforcement path — plugin-declared accessibility service interrupts the test app (Activity or fallback) — Plans 01-04, 01-07
- [x] Deployment — documented local full-stack run command, proven from a fresh `git clone` — Plan 01-08

## Out of Scope (Deferred to Later Slices)

- App list / `getInstalledApps`, usage tracking, Room storage, real rules, `LimitEngine` / TS evaluator (Phase 2, 4)
- JS-independent always-on behavior: reboot, process death, clock changes, watchdog (Phase 3)
- Localized block screen, breathing, friction unlock, warnings (Phase 5); themes/i18n/RTL visuals (Phase 6)
- Onboarding + Play accessibility disclosure/consent flow (Phase 7) — Phase 1 enables the service via adb only
- BAL re-validation on Android 10/12/14 and real OEM devices (Phase 12, QUAL-01/QUAL-04); iOS (v2.0)
- Firebase, Groq, any network service (Phases 9–11); EAS or any paid build service (never)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: daily limit on an app → blocked via the recorded primary block path → remove limit → usable (Room + `LimitEngine` against the shared vectors)
- Phase 3: enforcement survives JS death, offline, reboot, clock changes; watchdog
- Phase 4: all limit types + focus mode; Kotlin = TS on every shared vector in CI
- Phase 5: humane block experience + warnings
- Phase 6: wave design system + EN/UR localization with RTL (the Phase 1 RTL lint rule already guards styles)
- Phase 7: onboarding + Play-compliant permission flow
- Phase 8: insights, gamification, widgets
- Phases 9–10: Firebase-only family pairing and remote control
- Phase 11: free-tier Groq AI coach
- Phase 12: hardening across Android 7→16 / OEMs and Play release

## Actual Resolved Versions

_(Plan 01-08 fills this table from `package.json`, `pnpm-lock.yaml`, `android/gradle/wrapper/gradle-wrapper.properties` and `./gradlew --version`.)_

| Component | Version |
|---|---|
| expo | 57.0.25 |
| react-native | 0.86.3 |
| typescript | 5.9.3 |
| expo-router | 57.0.23 |
| jest-expo / jest | 57.0.5 / 29.7.0 |
| eslint / eslint-config-expo / prettier | 9.39.5 / 57.0.2 / 3.9.9 |
| Gradle wrapper | 9.3.1 |
| Android Gradle Plugin | 8.12.0 |
| Kotlin | 2.1.20 |
| compileSdk / targetSdk / minSdk | 36 / 36 / 24 |
