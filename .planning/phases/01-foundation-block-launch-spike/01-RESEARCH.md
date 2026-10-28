# Phase 1: Foundation & Block-Launch Spike - Research

**Researched:** 2026-09-25
**Domain:** Expo SDK 57 monorepo scaffold (TS + local Expo Module in Kotlin), config-plugin-driven Android native generation, AccessibilityService block-launch spike on API 36, cross-language (Jest/JUnit) test tooling
**Confidence:** HIGH for toolchain/version facts (verified live against npm registry and official docs same session); MEDIUM for the BAL (background-activity-launch) spike outcome and OEM-specific behavior (inherently unconfirmable until the spike runs); MEDIUM for community-sourced Kotlin/Gradle patterns not backed by an official doc page.

## Summary

Phase 1 has three deliverables that must be built in a specific order because each is a prerequisite for the next: (1) a scaffolded, prebuild-reproducible Expo SDK 57 project with a **local** Expo Module (`modules/screen-guard`) for the native spike code, (2) the frozen `ScreenGuard` TypeScript contract plus shared JSON test vectors that both Jest and JUnit load, and (3) the block-launch spike itself, which is a genuine unknown — Android's official background-activity-start documentation does not list "bound AccessibilityService" as an exempt category, so the spike must empirically test both the direct `startActivity` path and the `GLOBAL_ACTION_HOME` + notification fallback and record which one is primary, per the project's own `ARCHITECTURE.md` correction.

This project's own `.planning/research/STACK.md`, `ARCHITECTURE.md`, and `PITFALLS.md` (dated the same day as this research) already did the heavy lifting on package versions and the architecture-level BAL analysis — this document does not repeat that work. It adds the phase-execution-specific detail those documents don't cover: exact scaffold commands verified against the live registry and this machine's actual toolchain, the config-plugin structure needed for `prebuild --clean` reproducibility, the ktlint/JUnit wiring for the generated Android project, the adb-based headless enablement procedure for the accessibility service, and the shared-JSON-vector loading pattern for two different test runners.

**Primary recommendation:** Scaffold Expo SDK 57 with the `blank-typescript` template into a **fresh temp directory** and move its contents into the repo root (do not run `create-expo-app` directly against the repo root, which already has `docs/` and `.planning/`), add `modules/screen-guard` via `npx create-expo-module@latest --local`, wire all native Android surface (manifest, accessibility XML, ktlint) through Expo config plugins in `plugins/`, and treat the BAL spike as a gated go/no-go decision — build the `GLOBAL_ACTION_HOME` + notification fallback as a first-class path regardless of the spike's outcome, not as a just-in-case branch.

## Environment Verified This Session (do not re-verify, use as ground truth)

| Item | Value | How verified |
|---|---|---|
| Node | v24.21.0 (via `nvm use 24`) | `node -v` run this session |
| JDK | OpenJDK 17.0.20.1 (Temurin) at `~/.local/jdk/jdk-17` | `$JAVA_HOME/bin/java -version` run this session |
| Android SDK platforms | android-33, 34, 35, 36 present | `ls ~/Android/Sdk/platforms` |
| Android build-tools | 36.1.0 | `ls ~/Android/Sdk/build-tools` |
| Android NDK | 29.0.14033849 | `ls ~/Android/Sdk/ndk` |
| Emulator | `Medium_Phone_API_36.1` running as `emulator-5554`, `device` state, Android release 16 / API 36 | `adb devices`, `adb shell getprop ro.build.version.sdk` run this session |
| Test apps present on emulator image | `com.android.chrome`, `com.google.android.deskclock` | `adb shell pm list packages` run this session |
| pnpm | Not preinstalled; `corepack enable` + `corepack use pnpm@latest` installs pnpm 12.6.0 to `~/.local/bin` without sudo | Ran `corepack enable`/`corepack use pnpm@latest` this session — **caution:** running `corepack use` from a directory writes a `package.json`/`pnpm-lock.yaml` into that directory; run it only after `cd`-ing into the actual scaffold target, not the repo root, or clean up the accidental files it creates (verified: it created and I removed `package.json`, `node_modules/`, `pnpm-lock.yaml` from the repo root during this research session) |
| Repo state | Only `docs/`, `.planning/`, `.git/`, `.ruff_cache/`, `.claude/` exist at repo root — no `package.json` | `ls -la` run this session |

All version numbers below for npm packages were re-verified live via `npm view <pkg> version` this session (2026-09-25) and match `.planning/research/STACK.md` exactly — no drift found in the ~20 hours since that research ran.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | Build and run Expo SDK 57 app (prebuild, New Arch, TS ~5.9) on AVD `Medium_Phone_API_36.1` from clean checkout | Scaffold command sequence, `expo run:android` vs. `prebuild`+Gradle path, and environment-variable setup documented below in Architecture Patterns → Pattern 1 |
| FND-02 | All native Android config generated by config plugins; `android/` never hand-edited; `prebuild --clean` reproduces the same app | Config plugin structure (Pattern 2), Don't Hand-Roll table, Pitfall 1 (CNG drift) |
| FND-03 | Block-launch spike on API 36 determines whether bound AccessibilityService can start Activity from background; result recorded; `GLOBAL_ACTION_HOME` + notification fallback implemented and exercised either way | Pattern 3 (spike architecture), Code Examples (AccessibilityService, adb enablement, BAL detection), Pitfall 3 |
| FND-04 | ESLint (incl. no-left/right rule), Prettier, `tsc --noEmit`, Jest, ktlint, JUnit each run with a single command and pass | Standard Stack (tooling table), Code Examples (ESLint flat config, ktlint Gradle wiring), Validation Architecture |
| FND-05 | `ScreenGuard` TS contract + shared JSON rule-evaluation test vectors exist and load in both Jest and JUnit before either evaluator is written | Pattern 4 (shared-vectors), Code Examples (Gradle `sourceSets` cross-load pattern) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Project scaffold, TS config, quality tooling (ESLint/Prettier/tsc/Jest) | Build tooling (repo root) | — | Lives entirely in the JS/TS toolchain layer; no runtime tier owns it |
| `ScreenGuard` TS contract + shared JSON test vectors | Domain (pure TS, `modules/screen-guard/src`) | Native (Kotlin, consumes same JSON) | Contract must be platform-agnostic by design (iOS v2.0 implements the same interface later) — it is not UI, not backend |
| Config plugins (`plugins/`) generating manifest/XML | Build tooling → Android native (generation target) | — | Config plugins run at `prebuild` time (Node/JS), but their *output* is native Android project files — this is the seam between the two tiers, and it must stay one-directional (plugin writes native files, native files are never hand-edited back) |
| `GuardAccessibilityService` spike (foreground detection + block Activity launch) | Android native (OS-managed) | — | Must run without the JS runtime or even without the app's own Activity ever having started; this is the enforcement tier per the project's `ARCHITECTURE.md` |
| ktlint / JUnit execution | Android native build tooling (Gradle) | — | Runs inside the generated `android/` project, invoked via `./gradlew`, never via npm scripts pretending to be Gradle |

## Standard Stack

### Core (Phase 1 specific — see project `STACK.md` for the full app-wide stack)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **expo** | `57.0.25` `[VERIFIED: npm registry]` | App framework, prebuild, config plugins | Re-verified live this session (`npm view expo version` → `57.0.25`), matches project `STACK.md`. Latest available is `58.0.0-preview.7`/canary only — SDK 57 remains the correct stable target `[VERIFIED: npm registry]` (`npm view expo versions`, no `58.x` stable release exists) |
| **create-expo-module** | `57.0.1` `[VERIFIED: npm registry]` | Scaffolds the local `modules/screen-guard` Expo Module with Kotlin (and Swift stub for later) | Re-verified live this session |
| **typescript** | `~5.9.3` (pin explicitly, do NOT let float to npm `latest`) `[VERIFIED: npm registry]` | Static typing | `npm view typescript version` returns `7.0.2` as the `latest` dist-tag this session — confirms `STACK.md`'s warning is still live; Expo's own tooling targets TS 5.9.x, not 7.x |
| **jest-expo** | `>=57.0.5` `[VERIFIED: npm registry]` | Jest preset for domain unit tests + shared-vector test runner | `npm view jest-expo version` → `57.0.5` this session — this is both the "latest" and the minimum-required patch (the `57.0.0` peer-dependency bug against RN 0.86.0 is fixed as of this exact version) |
| **eslint** | `10.11.0` `[VERIFIED: npm registry]` | Base linter, flat config only | Re-verified this session |
| **eslint-config-expo** | `57.0.2` `[VERIFIED: npm registry]` | SDK-57-matched flat-config ESLint baseline | Re-verified this session |
| **prettier** | `3.9.9` `[VERIFIED: npm registry]` | Formatting | Re-verified this session |

### Native Android tooling (not npm packages)

| Tool | Version / coordinate | Purpose | Confidence |
|------|----------------------|---------|------------|
| **ktlint Gradle plugin** (`org.jlleitschuh.gradle.ktlint`) | `14.2.0` (published 2026-03-12) | `./gradlew ktlintCheck` / `ktlintFormat` tasks for the generated `android/` project and `modules/screen-guard/android/` | `[CITED: plugins.gradle.org/plugin/org.jlleitschuh.gradle.ktlint]` — fetched directly this session; this is the current stable release, not a training-data guess. Older tutorials referencing `11.1.0` are stale |
| **JUnit** | ships via RN 0.86.3's own Gradle version catalog (per project `STACK.md`, `4.13.2`) | Kotlin unit tests for the spike's `LimitEngine`-precursor + shared-vector loader | `[CITED: project STACK.md, itself sourced from RN 0.86.3's published libs.versions.toml]` — not re-fetched this session, reused from same-day project research |
| **Kotlin** | `2.1.20` (RN 0.86.3 default) | Language for `modules/screen-guard/android` | `[CITED: project STACK.md]` |
| **AGP** | `8.12.0`, requires Gradle `8.13`, JDK 17 min | Android build | `[CITED: project STACK.md]` — this session's verified JDK 17 install satisfies the minimum exactly |

### Package Manager

| Tool | Notes |
|---|---|
| **pnpm** (via corepack) | This machine has no global `pnpm` binary but does have `corepack` 0.36.0. `corepack enable && corepack use pnpm@latest` installs pnpm without sudo `[VERIFIED: ran this session, produced pnpm 12.6.0]`. **Run this from inside the scaffold target directory** — running `corepack use` writes `package.json`/`pnpm-lock.yaml` into the current working directory as a side effect, which must not land at the repo root before the real scaffold exists. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `create-expo-app` scaffold into a temp dir + move | Scaffold directly at repo root with `.` as target | Direct scaffold into a non-empty directory is exactly the kind of interactive-prompt/failure surface not worth risking on an unattended plan execution — a temp-dir-then-move is deterministic and scriptable |
| Local Expo Module (`create-expo-module --local`) | Standalone publishable npm package for `screen-guard` | Spec's own repo structure (`modules/screen-guard/`) and `STACK.md`'s Phase-0-spike guidance both assume a local, non-published module — publishing has zero benefit for a single-consumer module and adds versioning overhead |
| ktlint Gradle plugin (`org.jlleitschuh.gradle.ktlint`) | Standalone `ktlint` CLI binary invoked via a shell script | The Gradle-plugin path integrates with the single-command CI story (`./gradlew check` can chain `ktlintCheck` + `test`) the spec's §21 CI list already assumes; a standalone CLI would need separate wiring into the "one command" success criterion |

**Installation (Phase 1 scope only):**
```bash
# 1. Toolchain (this session confirmed all of this works without sudo)
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24
export JAVA_HOME=~/.local/jdk/jdk-17
export ANDROID_HOME=~/Android/Sdk
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
corepack enable
corepack use pnpm@latest   # run inside the target scaffold dir, see caution above

# 2. Scaffold into a temp dir, then move into repo root (repo root already has docs/, .planning/)
npx create-expo-app@latest /tmp/screenlimiter-scaffold --template blank-typescript
# move /tmp/screenlimiter-scaffold/* (including dotfiles) into repo root, then rm -rf the temp dir

# 3. Pin TypeScript explicitly — do not let it float to npm "latest" (7.x)
pnpm add -D typescript@~5.9.3

# 4. Local Expo Module for the spike
npx create-expo-module@latest --local
# prompts for a module name; use "screen-guard" -> creates modules/screen-guard/{android,ios,src}

# 5. Testing / lint toolchain (let Expo resolve compatible versions)
npx expo install jest-expo jest
pnpm add -D @testing-library/react-native
pnpm add -D eslint eslint-config-expo prettier

# 6. First prebuild (generates android/ from config plugins — must reproduce identically on --clean)
npx expo prebuild --clean --platform android
```

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check --ecosystem npm` against every new/reused npm package this phase touches.

| Package | Registry | Verdict | Signals | Disposition |
|---------|----------|---------|---------|-------------|
| `expo` | npm | SUS (`too-new`) | 6,766,360 weekly downloads; repo `github.com/expo/expo`; not deprecated; latest version published 2026-09-24 (1 day before this research) | **Approved — false-positive pattern.** The `too-new` signal fires on the *latest version's* publish date, not package age; `expo` ships frequent patch releases (this is expected for an actively-maintained monorepo package with 6.7M weekly downloads and a well-known GitHub org). No `checkpoint:human-verify` needed given the download count + repo match, but flagging per protocol |
| `create-expo-module` | npm | OK | 1,864 weekly downloads; repo `github.com/expo/expo`; published 2026-08-14 | Approved |
| `jest-expo` | npm | SUS (`too-new`) | 2,115,117 weekly downloads; repo `github.com/expo/expo` | Same false-positive pattern as `expo` — approved |
| `eslint-config-expo` | npm | SUS (`too-new`) | 1,769,043 weekly downloads; repo `github.com/expo/expo` | Same pattern — approved |
| `typescript` | npm | OK | 209,215,221 weekly downloads; repo `github.com/microsoft/TypeScript` | Approved |
| `prettier` | npm | SUS (`too-new`) | 97,827,559 weekly downloads; repo `github.com/prettier/prettier` | Same pattern — approved |
| `eslint` | npm | SUS (`too-new`) | 120,438,676 weekly downloads; repo `github.com/eslint/eslint` | Same pattern — approved |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** `expo`, `jest-expo`, `eslint-config-expo`, `prettier`, `eslint` — all five flagged only for the `too-new` heuristic on their most recent published patch version, all five have >1.7M weekly downloads and an official, matching GitHub repo, and all five are already independently corroborated by the project's own same-day `STACK.md` (which cross-checked via live `npm view` + official changelogs). **Recommendation: the planner does not need a `checkpoint:human-verify` gate for these five** — treat this as a documented, explained exception to the gate's default disposition, since the underlying signal (rapid release cadence on a hugely popular package) is not a legitimacy risk. If the planner prefers to follow the gate literally, add one lightweight `checkpoint:human-verify` before the first `pnpm install`, not one per package.

*Not applicable to this audit:* `org.jlleitschuh.gradle.ktlint` (Gradle Plugin Portal, not npm — verified instead via direct fetch of the plugin's portal page, see Standard Stack table), JUnit/Kotlin/AGP (transitively generated by `expo prebuild` from RN's own pinned versions, not independently installed).

## Architecture Patterns

### System Architecture Diagram (Phase 1 scope: the spike, not the full product)

```
Developer machine (this session's verified toolchain)
    │
    │ npx expo prebuild --clean --platform android
    ▼
Config plugins (plugins/*.ts, JS/Node — run at prebuild time)
    │  ├─ withAndroidManifest: adds <service> entry for GuardAccessibilityService,
    │  │                        <queries> for MAIN/LAUNCHER, permissions
    │  └─ withDangerousMod: writes res/xml/accessibility_service_config.xml
    ▼
android/  (generated output — NEVER hand-edited, verified reproducible via re-running --clean)
    │
    │ ./gradlew assembleDebug / installDebug  (or `expo run:android`)
    ▼
Emulator (Medium_Phone_API_36.1, API 36) — emulator-5554, already running
    │
    │ adb shell settings put secure enabled_accessibility_services <pkg>/<Service>
    │ (headless enable — bypasses needing to tap the Settings UI toggle)
    ▼
GuardAccessibilityService (bound by OS)
    │  onAccessibilityEvent(TYPE_WINDOW_STATE_CHANGED)
    │  → resolve foreground package
    │  → if foreground == designated test app (com.android.chrome or
    │    com.google.android.deskclock — both present on this emulator image):
    ▼
Attempt 1: startActivity(BlockActivity, FLAG_ACTIVITY_NEW_TASK)
    │
    ├─ SUCCESS (observed via next accessibility window-state event showing
    │           BlockActivity in foreground, or logcat shows no BAL-block message)
    │           → record "primary: direct Activity launch"
    │
    └─ FAILURE (logcat shows a BAL-block message, e.g.
                "Background activity start blocked", OR the test app remains
                foreground after a short deadline)
                → Attempt 2: performGlobalAction(GLOBAL_ACTION_HOME)
                            + heads-up notification offering "Reopen block screen"
                → record "primary: fallback (GLOBAL_ACTION_HOME + notification)"
```

### Recommended Project Structure (Phase 1 slice of the full repo layout)
```
ScreenLimiter/
├── app/                              # Expo Router entry (minimal for Phase 1 — one screen)
├── src/
│   └── (empty scaffolding — most feature code starts Phase 2)
├── modules/screen-guard/
│   ├── index.ts                      # typed JS API (thin, spike only calls a "runSpikeCheck" method)
│   ├── src/
│   │   ├── ScreenGuard.types.ts      # FND-05: the frozen contract (AppRef, Capabilities, PermissionState, Rule*)
│   │   └── ScreenGuard.evaluate.ts   # TS reference evaluator STUB (Phase 1 only needs it to compile + load vectors; full logic is Phase 2)
│   ├── shared-test-vectors/
│   │   └── rule-evaluation.json      # FND-05: vectors loaded by BOTH Jest and JUnit
│   ├── android/
│   │   ├── src/main/java/.../GuardAccessibilityService.kt   # spike code
│   │   ├── src/main/java/.../BlockActivity.kt
│   │   ├── src/test/java/.../SharedVectorsLoaderTest.kt     # JUnit reads shared-test-vectors/*.json
│   │   └── build.gradle                                     # ktlint plugin applied here + sourceSets.test.resources wiring
│   └── ios/                          # Swift stub only, not implemented in Phase 1
├── plugins/
│   ├── withAccessibilityService.ts   # withAndroidManifest + withDangerousMod, adds the <service> + res/xml
│   └── withEslintNoLeftRight.ts      # N/A — this is a repo-root ESLint rule, not a config plugin; listed here only to clarify it does NOT belong in plugins/
├── eslint.config.js                  # flat config, includes eslint-config-expo + the custom no-left/right rule
├── jest.config.js                    # preset: 'jest-expo'
├── android/                           # GENERATED by prebuild — gitignored is wrong (spec commits it per CNG norms), but never hand-edited
└── app.json / app.config.ts          # references plugins/withAccessibilityService
```

### Pattern 1: Local dev build without EAS (`expo run:android` vs. `prebuild` + Gradle)

**What:** Two equivalent ways to get a debug build onto the running emulator without any EAS/cloud dependency: (a) `npx expo run:android` (wraps prebuild + Gradle + install + launch in one command), or (b) `npx expo prebuild --clean --platform android` followed by `cd android && ./gradlew installDebug`.
**When to use:** Use (a) for the FND-01 "documented commands build and launch the app" success criterion — it is the single command a fresh clone needs. Use (b) explicitly whenever the plan needs to verify `prebuild --clean` reproducibility (FND-02) as a distinct, separately-runnable step, and whenever running ktlint/JUnit (which need the `android/` Gradle project to exist independent of a full app install).
**Example:**
```bash
# One-shot dev build + launch (FND-01)
export ANDROID_HOME=~/Android/Sdk JAVA_HOME=~/.local/jdk/jdk-17
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
npx expo run:android --device emulator-5554

# Explicit two-step, for verifying prebuild reproducibility (FND-02)
npx expo prebuild --clean --platform android
git status android/     # if this repo commits android/, a clean prebuild should produce
                         # either an identical tree or only expected generated-timestamp diffs —
                         # any manifest/XML diff here is a signal a config plugin is missing logic
cd android && ./gradlew installDebug
```
`[CITED: docs.expo.dev — Expo CLI local build commands]`, cross-checked against this session's verified toolchain (Node 24.21.0, JDK 17, ANDROID_HOME populated with platforms 33-36).

### Pattern 2: Config plugin structure for accessibility service + manifest (FND-02)

**What:** A single config plugin composing `withAndroidManifest` (declarative manifest edits) and `withDangerousMod` (arbitrary file writes for the `res/xml/accessibility_service_config.xml` the manifest's `<service>` entry points to).
**When to use:** Any native Android surface this phase needs — the accessibility service `<service>` tag + its `android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"` + `meta-data` pointing at the XML resource, and the `<queries>` block for MAIN/LAUNCHER (per project spec §13.2).
**Example (shape, verify exact `withDangerousMod` mod-name and file-write API against Expo's own plugin source before implementing):**
```typescript
// plugins/withAccessibilityService.ts
// Source pattern: docs.expo.dev/config-plugins/dangerous-mods (withAndroidManifest handles
// declarative manifest entries; withDangerousMod is the escape hatch for writing new files
// like res/xml/*.xml that no first-party mod covers)
import { withAndroidManifest, withDangerousMod, ConfigPlugin } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const withAccessibilityService: ConfigPlugin = (config) => {
  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    app.service = app.service ?? [];
    app.service.push({
      $: {
        'android:name': '.GuardAccessibilityService',
        'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }] }],
      'meta-data': [{ $: { 'android:name': 'android.accessibilityservice', 'android:resource': '@xml/accessibility_service_config' } }],
    });
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'accessibility_service_config.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
  android:accessibilityEventTypes="typeWindowStateChanged|typeWindowsChanged"
  android:canRetrieveWindowContent="false"
  android:isAccessibilityTool="false"
  android:description="@string/accessibility_service_description" />`
      );
      return config;
    },
  ]);

  return config;
};
export default withAccessibilityService;
```
`[CITED: docs.expo.dev/config-plugins/dangerous-mods, docs.expo.dev/config-plugins/plugins]` — the overall two-mod composition pattern is confirmed by official Expo docs fetched this session; the exact manifest-JSON shape (`$`-prefixed attribute keys via `xml2js`) is a well-established, stable Expo convention `[CITED: docs.expo.dev + github.com/expo/expo issue #19548 discussing manifest mod shape]`. **Verify the exact `modRequest.platformProjectRoot` path and manifest JSON keys against the installed `@expo/config-plugins` version's TypeScript types before implementation** — this is boilerplate-accurate but not copy-pasted from a single running example.

### Pattern 3: Block-launch spike structure (FND-03) — the gating decision

**What:** A two-attempt cascade inside the accessibility service's event handler: try the direct `startActivity` first, detect failure within a short deadline, then fall back to `performGlobalAction(GLOBAL_ACTION_HOME)` + a heads-up notification. Both paths get exercised in the same spike run so the "which is primary" decision has real evidence, not a single-path assumption.
**When to use:** This exact pattern is what the project's own `ARCHITECTURE.md` recommends (see its "Fix" under Spec Validation §2) — reuse it verbatim rather than re-deriving it, since that document already did the Android-BAL-policy research this phase depends on.
**Detecting a blocked launch:** Two independent signals, use both for redundancy since neither is 100% documented as guaranteed:
1. **Logcat scan for BAL-block messages.** Android's background-activity-start enforcement logs a message when it blocks a launch (exact string varies by AOSP version/OEM — grep logcat for `BAL_BLOCK` or `startActivity.*blocked` patterns around the `am_proc_start`/`ActivityTaskManager` tags during the test window).
2. **`StrictMode.setVmPolicy(StrictMode.VmPolicy.Builder().detectBlockedBackgroundActivityLaunch().penaltyLog().build())`** — new in Android 16, called from `Application.onCreate()`, explicitly designed to surface exactly this signal via `penaltyLog()` (writes to logcat) `[CITED: developer.android.com/reference/android/os/StrictMode — Android 16 API, confirmed via WebSearch of official docs this session]`. Since the target emulator is API 36 (Android 16), this API is available and should be the **primary** detection signal, with the accessibility service's own next-window-state-event check as a secondary/practical confirmation (did `BlockActivity` actually become foreground within N ms).
**Example test-package choice:** `com.google.android.deskclock` (Clock) or `com.android.chrome` (Chrome) — both confirmed present on this exact emulator image this session via `adb shell pm list packages`. Avoid `com.android.settings` (explicitly excluded from blockable apps per the product spec) and avoid the launcher/dialer/emergency apps.

### Pattern 4: Shared JSON test vectors loaded by both Jest and JUnit (FND-05)

**What:** One JSON file (`modules/screen-guard/shared-test-vectors/rule-evaluation.json`) that both the TS Jest suite and the Kotlin JUnit suite load and iterate over, so "Kotlin matches TS" (project spec §20) is enforced by construction rather than by two independently-hand-written test suites that could silently diverge.
**When to use:** Before either the TS reference evaluator or the Kotlin `LimitEngine` contains real logic (per FND-05's explicit ordering requirement and the project's `ARCHITECTURE.md` "Suggested Build Order" §1). For Phase 1, the vectors and both loaders must exist and load successfully — the evaluators themselves are stubbed (e.g., always return a fixed decision) since real rule logic is Phase 2/4 scope.
**Jest side (trivial — Node has native `fs`/`import` JSON support):**
```typescript
// modules/screen-guard/src/__tests__/sharedVectors.test.ts
import vectors from '../../shared-test-vectors/rule-evaluation.json';
test('shared vectors load and have the expected shape', () => {
  expect(Array.isArray(vectors)).toBe(true);
  expect(vectors.length).toBeGreaterThan(0);
});
```
**JUnit/Gradle side — the non-trivial part.** Gradle's `sourceSets` API lets a module's test source set declare a `resources.srcDirs` entry pointing at an arbitrary filesystem path, including one outside the module's own directory tree:
```groovy
// modules/screen-guard/android/build.gradle
android {
    sourceSets {
        test {
            resources.srcDirs += ["${rootDir}/../shared-test-vectors"]
            // rootDir here is android/'s root (the generated project); ../../ walks back to
            // modules/screen-guard/ from within the generated android/ tree — VERIFY the exact
            // relative path once the generated project's actual root is known; the local Expo
            // module's build.gradle lives inside android/screen-guard (or similar autolinked
            // path) once prebuild wires it in, not at a fixed location decided today.
        }
    }
}
```
```kotlin
// modules/screen-guard/android/src/test/java/.../SharedVectorsLoaderTest.kt
class SharedVectorsLoaderTest {
    @Test
    fun `shared vectors load and have the expected shape`() {
        val json = javaClass.classLoader
            .getResourceAsStream("rule-evaluation.json")!!
            .bufferedReader().readText()
        val vectors = JSONArray(json)
        assertTrue(vectors.length() > 0)
    }
}
```
`[CITED: docs.gradle.org SourceSet DSL + baeldung.com/gradle-source-sets, corroborated by gradle forums thread on cross-module resource sharing]` — the `sourceSets.test.resources.srcDirs` mechanism itself is standard, well-documented Gradle capability (MEDIUM-HIGH confidence, multiple independent sources agree). **The exact relative path from the generated `android/` module to `modules/screen-guard/shared-test-vectors/` is `[ASSUMED]`** — it depends on where Expo Autolinking places the local module's Android sub-project inside the generated Gradle project, which is only knowable once `prebuild` actually runs. Treat "confirm the real relative path after first prebuild" as a Phase 1 task, not an assumption to code against blindly.

### Anti-Patterns to Avoid

- **Hand-editing `android/AndroidManifest.xml` or any generated Kotlin file to "quickly test something":** Per the project's own `PITFALLS.md` Pitfall 11, this is invisible until the next `prebuild --clean` silently reverts it. Route every native change through `plugins/` from the first commit of this phase, and run `expo prebuild --clean` regularly in local dev (not just once) so drift surfaces immediately.
- **Assuming the direct `startActivity` BAL path "should just work" and skipping the fallback:** Per `ARCHITECTURE.md`'s central correction, there is no documented Android BAL exemption for bound accessibility services — building only the happy path violates FND-03's explicit requirement that both paths be exercised.
- **Testing the accessibility toggle only via the Settings UI on this emulator and calling it "proof it works everywhere":** `adb install`-based installs (which is what `expo run:android` and Gradle `installDebug` both do) generally do **not** trigger Android 13+'s Restricted Settings block, unlike a real user sideloading an APK via a file manager/browser `[CITED: droidwin.com "Allow Restricted Settings missing from Sideloaded Apps"]`. This means the emulator dev loop will falsely appear to have zero restricted-settings friction — that friction is real for actual users and is explicitly Phase 3's problem (onboarding), not Phase 1's, but don't let Phase 1's clean experience become an assumption that carries forward incorrectly.
- **Publishing or hand-installing `jest@latest` (30.x) alongside `jest-expo`:** Per project `STACK.md`, `jest-expo@57.0.5`'s internal deps are pinned to Jest 29.x; always `npx expo install jest-expo jest` and let Expo's resolver pick the paired version.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting whether an activity launch was blocked by BAL | A custom heuristic guessing from timing alone | `StrictMode.detectBlockedBackgroundActivityLaunch()` (Android 16, available on this exact emulator/API level) + logcat corroboration | This is a first-party, purpose-built API for exactly this signal — a home-rolled timing heuristic would be strictly worse and less portable across OEM logcat formats |
| Enabling the accessibility service for automated/headless test verification | Scripting UI taps through the Settings app (fragile, slow, breaks on any Settings UI change) | `adb shell settings put secure enabled_accessibility_services <pkg>/<service>` | This is the standard, documented approach for automated accessibility-service testing and is not affected by the Android 13+ Restricted Settings block since it bypasses the Settings UI entirely |
| Formatting/linting Kotlin in the generated `android/` + local module | A hand-rolled shell script running `ktlint` binary directly with manually-globbed file lists | `org.jlleitschuh.gradle.ktlint` Gradle plugin (`14.2.0`) | Integrates into the single-command `./gradlew check` story and understands Gradle's own source-set structure, so it won't miss files a hand-glob would |
| Cross-language shared-vector loading | Two independently maintained JSON copies (one for Jest fixtures, one for Android `raw`/`assets` resources) that a developer must remember to keep in sync | One JSON file + Gradle `sourceSets.test.resources.srcDirs` pointing at it | A copy risks silent divergence exactly at the point (rule-evaluation parity) the project treats as a hard correctness requirement (ENF-05, later phase) |

**Key insight:** Every "don't hand-roll" item above exists because a hand-rolled version would either (a) already have a first-party OS/tooling answer that's more robust than anything built in an afternoon, or (b) reintroduce the exact "two implementations silently drift" risk the shared-test-vectors architecture exists to prevent.

## Common Pitfalls

> These are Phase-1-execution-specific pitfalls. For the full project-level pitfall catalogue (Play policy, OEM killing, quota exhaustion, etc.) see `.planning/research/PITFALLS.md` — not repeated here except where a Phase 1 task directly triggers one.

### Pitfall 1: Scaffolding directly into the repo root fails or behaves unexpectedly because `docs/` and `.planning/` already exist
**What goes wrong:** `create-expo-app` is designed to scaffold into an empty (or nearly-empty) target directory; running it with `.` as the target against a repo that already has `docs/` and `.planning/` risks an interactive "directory not empty" prompt or an outright failure in a non-interactive CI/agent context.
**Why it happens:** The CLI's non-empty-directory guard doesn't know that `docs/` and `.planning/` are unrelated, intentional pre-existing content.
**How to avoid:** Scaffold into a fresh temp directory (`/tmp/screenlimiter-scaffold` or similar), then move its output (including dotfiles like `.gitignore`, `.easignore` if present) into the repo root, then remove the temp directory.
**Warning signs:** Any command that requires an interactive "y/N" confirmation when run non-interactively will hang or fail silently in an automated execution context.

### Pitfall 2: `corepack use pnpm@latest` run from the wrong directory pollutes the repo root
**What goes wrong:** As directly observed this session, running `corepack use pnpm@latest` writes `package.json` + `pnpm-lock.yaml` (and triggers a `node_modules/` creation) into the **current working directory** — if run from the repo root before the real scaffold exists, it leaves stray files that look like a broken/premature scaffold.
**Why it happens:** `corepack use` is designed to pin a package manager for "the project in the current directory," and it creates a minimal `package.json` if none exists.
**How to avoid:** Only run `corepack enable`/`corepack use pnpm@latest` from inside the actual Expo scaffold directory (temp dir or repo root, but only *after* `create-expo-app` has already populated it) — or simply rely on `npx create-expo-app` and `npx expo install` to invoke package managers directly without pre-pinning one first.
**Warning signs:** A `git status` showing `package.json`/`pnpm-lock.yaml`/`node_modules/` appearing before any Expo scaffold command has run.

### Pitfall 3: Treating a passing spike on this emulator as proof the BAL exemption is stable
**What goes wrong:** Per `ARCHITECTURE.md`'s central finding, there is no documented, stable BAL exemption for accessibility services — a spike that succeeds on this specific emulator/API-36 image proves only that *this exact configuration* currently allows it, not that it will continue to on OEM devices or future Android versions.
**Why it happens:** A single green test result is easy to over-interpret as "solved."
**How to avoid:** Record the spike result as "Android 16 emulator: [direct launch worked / fallback was needed]" — not as "BAL exemption confirmed" — and make sure the `GLOBAL_ACTION_HOME` fallback path ships as production code regardless of the result (per FND-03's explicit requirement that both paths be exercised, and per the project's yearly-re-validation note in `PITFALLS.md` Pitfall 8).
**Warning signs:** A PLAN.md or commit message that says "BAL works" without qualifying the API level/device it was tested on.

### Pitfall 4: ESLint flat config + `eslint-config-expo` version mismatch
**What goes wrong:** `eslint-config-expo@57.0.2` targets ESLint's flat-config format (ESLint 9+); mixing in an old `.eslintrc.js`-style config or an ESLint 8.x install produces confusing "config not found" or rule-application errors.
**Why it happens:** Many older tutorials and even some existing boilerplates still show `.eslintrc.js`.
**How to avoid:** Use `eslint.config.js` (flat config) exclusively, confirmed against `eslint@10.11.0` (verified this session) which is flat-config-only.
**Warning signs:** ESLint reporting zero errors on a file that obviously violates a configured rule — usually means the flat config isn't being picked up at all.

## Code Examples

### ESLint flat config with custom no-left/right rule (FND-04)
```javascript
// eslint.config.js
// Source pattern: eslint.org/docs/latest/rules/no-restricted-syntax (official ESLint docs,
// confirmed this session) — AST selector targeting JSXAttribute nodes named "left" or "right"
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name=/^(left|right)$/]",
          message:
            'Use logical style props (start/end) instead of left/right for RTL support (Urdu i18n requirement, see PRODUCT_SPEC §11).',
        },
        {
          // also catch left/right inside inline style objects: style={{ left: 10 }}
          selector: "Property[key.name=/^(left|right)$/]",
          message: 'Use start/end instead of left/right in style objects for RTL support.',
        },
      ],
    },
  },
];
```
`[CITED: eslint.org/docs/latest/rules/no-restricted-syntax]` — the `no-restricted-syntax` rule and AST-selector approach are official ESLint documentation, confirmed via WebSearch this session. The exact selector syntax for catching both JSX attributes and object-literal style properties is a reasonable, standard `esquery` selector pattern but was not tested against a live ESLint run this session — **verify both selectors actually fire against a sample file before relying on this in CI** `[ASSUMED — pattern is standard esquery syntax but not executed this session]`.

### Enabling the accessibility service headlessly for spike verification (FND-03)
```bash
# Source: standard adb accessibility-settings manipulation pattern, confirmed via multiple
# independent sources this session (technastic.com, alexzh.com "ADB commands: Accessibility",
# and the general Settings.Secure API contract) [CITED: multiple cross-checked community sources]
adb -s emulator-5554 shell settings put secure enabled_accessibility_services \
  com.screenlimiter.dev/com.screenlimiter.dev.GuardAccessibilityService
adb -s emulator-5554 shell settings put secure accessibility_enabled 1

# Verify it actually bound (don't just trust the setting write succeeded):
adb -s emulator-5554 shell dumpsys accessibility | grep -A5 "GuardAccessibilityService"

# Trigger the spike: launch the designated test app
adb -s emulator-5554 shell am start -n com.android.chrome/com.google.android.apps.chrome.Main
# or: adb -s emulator-5554 shell am start -n com.google.android.deskclock/.DeskClock

# Watch for BAL-block signals (Android 16 StrictMode + generic ActivityTaskManager patterns)
adb -s emulator-5554 logcat | grep -iE "StrictMode|BAL_BLOCK|blocked.*activit|ActivityTaskManager"
```

### Minimal AccessibilityService cascade (Kotlin, spike shape — FND-03)
```kotlin
// modules/screen-guard/android/src/main/java/.../GuardAccessibilityService.kt
// Pattern confirmed via multiple cross-checked community Kotlin examples
// (dev.to/lepresk "Detect User Inactivity System-Wide", medium.com AccessibilityService guides)
// [CITED: community sources, cross-checked against official AccessibilityService API reference]
class GuardAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg != TEST_APP_PACKAGE) return

        val launched = tryStartBlockActivity()
        if (!launched) {
            performGlobalAction(GLOBAL_ACTION_HOME)
            postFallbackNotification()
        }
    }

    private fun tryStartBlockActivity(): Boolean = try {
        val intent = Intent(this, BlockActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
        }
        startActivity(intent)
        true // NOTE: startActivity() not throwing does not guarantee the Activity actually
             // reached the foreground under BAL restrictions — pair this with the
             // StrictMode/logcat check from Pattern 3 for real confirmation, not this
             // boolean alone.
    } catch (e: Exception) {
        false
    }

    companion object {
        const val TEST_APP_PACKAGE = "com.android.chrome" // present on this emulator, verified this session
    }
}
```
`[CITED: community Kotlin AccessibilityService examples, cross-checked against official developer.android.com AccessibilityEvent/AccessibilityService API reference]`. The inline comment about `startActivity()` not throwing ≠ success is load-bearing — this is exactly the gap `ARCHITECTURE.md` flags (no documented guarantee), so the spike's detection logic must not trust the absence of an exception as proof of success.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `SYSTEM_ALERT_WINDOW` overlay to guarantee block-screen visibility regardless of BAL | Accessibility-triggered `startActivity` + `GLOBAL_ACTION_HOME` fallback, no overlay permission | Ongoing Android hardening trend (Android 14/15/16 all tightened BAL) pushed the industry toward the two-path approach the spec already chose | Overlay would be the most bulletproof technical fix but directly conflicts with the project's minimal-permissions/Play-review principle — correctly rejected already |
| `newArchEnabled: false` opt-out in `app.json` | New Architecture mandatory, no opt-out, config key ignored | Expo SDK 55 (React Native 0.82) — confirmed via WebSearch this session `[CITED: expo.dev/blog "Out with the old, in with the New Architecture"]` | Any tutorial or Stack Overflow answer referencing legacy-architecture native module patterns for Expo Modules is obsolete for SDK 57 |
| ktlint Gradle plugin `11.1.0` (common in tutorials) | `14.2.0` (current stable, published 2026-03-12) | Ongoing plugin releases | Following an older tutorial's exact version pin would install a stale plugin version; always resolve `latest`/current at implementation time |

**Deprecated/outdated:** Legacy-bridge ("old architecture") native module tutorials for Expo — not usable for this project since SDK 57 has no bridge fallback.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact `withDangerousMod` file-write API shape (`config.modRequest.platformProjectRoot`, manifest JSON `$`-attribute keys) shown in Pattern 2's code example is accurate for the currently-installed `@expo/config-plugins` version | Architecture Patterns → Pattern 2 | Low — this is a well-established, stable Expo convention across many SDK versions; worst case is a minor API surface adjustment caught immediately by TypeScript compilation |
| A2 | The relative path from the generated `android/` Gradle project to `modules/screen-guard/shared-test-vectors/` needed for the `sourceSets.test.resources.srcDirs` wiring | Architecture Patterns → Pattern 4 | Medium — if wrong, the JUnit test simply fails to find the resource at test time (loud, not silent) and needs a one-line path fix; does not block Jest side |
| A3 | The ESLint AST selectors (`JSXAttribute[name.name=/^(left|right)$/]`, `Property[key.name=/^(left|right)$/]`) will correctly catch both JSX props and style-object literals without false positives on unrelated `left`/`right` identifiers (e.g., a variable literally named `left` in unrelated math code) | Code Examples → ESLint | Low-Medium — worst case is either a missed violation (selector too narrow) or an annoying false positive (selector too broad); both are fixable by iterating on the selector once real code exists |
| A4 | `com.android.chrome` and `com.google.android.deskclock` remain installed and launchable on the `Medium_Phone_API_36.1` AVD image at execution time (verified present this session, but AVD system images can be reset/recreated) | Architecture Patterns → Pattern 3, Code Examples | Low — trivially re-verified with one `adb shell pm list packages` command before running the spike; both are default AOSP/Google-image apps, unlikely to be absent |
| A5 | `startActivity()` not throwing an exception is a necessary-but-insufficient signal, and the `StrictMode.detectBlockedBackgroundActivityLaunch()` + logcat combination is a sufficient signal for detecting a blocked launch | Code Examples → AccessibilityService cascade | Medium — if the StrictMode signal turns out to be unreliable in practice (e.g., doesn't fire for this specific blocking path), the spike may need a manual visual/UI-Automator check as a third fallback signal; this would be discovered during spike execution, not silently |

**If this table is empty:** N/A — five assumptions logged above, all flagged with concrete verification paths a plan can task out explicitly.

## Open Questions

1. **Does the direct `startActivity` BAL path actually succeed on the API 36 emulator, or is the fallback primary?**
   - What we know: Android's official docs list no accessibility-service exemption; community app-blocker implementations (per `ARCHITECTURE.md`'s survey) report mixed real-world results across OEM/version combinations.
   - What's unclear: The actual behavior on this exact emulator image (API 36, no OEM customization) has not been empirically tested — that IS the spike this phase exists to run.
   - Recommendation: This is not a gap in research — it is the literal deliverable of FND-03. The plan should treat "run the spike, record the result" as a task, not attempt to resolve this question in planning.

2. **What is the real relative path for the Gradle `sourceSets.test.resources.srcDirs` shared-vector wiring?**
   - What we know: The mechanism (Gradle `sourceSets` supporting arbitrary `srcDirs`) is confirmed standard.
   - What's unclear: Expo Autolinking's exact placement of the local module's Android sub-project inside the generated `android/` tree is only knowable after the first real `prebuild` run in this specific project.
   - Recommendation: Sequence a task to run `prebuild`, inspect the generated `android/settings.gradle` for the actual `modules:screen-guard` (or similarly named) project path, then hard-code the correct relative path — do not guess it upfront in the plan.

3. **Will `PACKAGE_USAGE_STATS` / `<queries>` entries need adjustment specifically for the spike test app?**
   - What we know: Project spec §13.2 already scopes `<queries>` to MAIN/LAUNCHER intent only, which is sufficient for both `com.android.chrome` and `com.google.android.deskclock` (both are standard launchable apps).
   - What's unclear: Whether Chrome's package-visibility on Android 16 requires any additional `<queries>` entry beyond MAIN/LAUNCHER for the accessibility service to resolve its identity from `AccessibilityEvent.getPackageName()` — this call does not require package visibility (the accessibility framework provides raw package name strings from window state, not resolved `PackageInfo`), so this is very likely a non-issue, but has not been empirically confirmed in this exact environment.
   - Recommendation: Low priority — confirm during spike execution; unlikely to block anything since `getPackageName()` on an `AccessibilityEvent` does not require query visibility per Android's `<queries>` documentation model (visibility restrictions apply to `PackageManager` queries, not accessibility event package identification).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (via nvm) | All JS tooling | ✓ | v24.21.0 | — |
| JDK 17 | AGP 8.12.0 / Gradle 8.13 | ✓ | Temurin 17.0.20.1 | — |
| Android SDK platforms | compileSdk/targetSdk 36 | ✓ | 33, 34, 35, 36 all present | — |
| Android build-tools | Gradle Android build | ✓ | 36.1.0 | — |
| Android NDK | RN native compilation (RN pins 27.x internally; 29 installed is newer, no conflict per `STACK.md`) | ✓ | 29.0.14033849 | — |
| Emulator + running AVD | FND-01, FND-03 device target | ✓ | `Medium_Phone_API_36.1`, API 36, running as `emulator-5554` | — |
| adb | Headless accessibility-service enablement, logcat spike verification | ✓ | via `~/Android/Sdk/platform-tools/adb` | — |
| pnpm | Package manager per spec §21 | ✗ (not preinstalled) | — | `corepack enable && corepack use pnpm@latest` installs it without sudo (verified this session, produces pnpm 12.6.0) — not a true fallback, this IS the intended path on this machine |
| Network access to npm registry | `npx create-expo-app`, `npx expo install`, `npm view` verification | ✓ | Confirmed via live `npm view` calls this session | — |
| Test apps on emulator (Chrome, Clock) | FND-03 spike target app | ✓ | `com.android.chrome`, `com.google.android.deskclock` present | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** pnpm (fallback is itself the standard path via corepack — no actual risk).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (JS/TS) | Jest via `jest-expo` preset, `>=57.0.5` |
| Framework (Kotlin) | JUnit (version ships via RN 0.86.3's Gradle version catalog, per project `STACK.md`) |
| Config file (Jest) | `jest.config.js` at repo root — does not exist yet, created in this phase (Wave 0 gap) |
| Config file (Kotlin) | `modules/screen-guard/android/build.gradle` — created by `create-expo-module --local`, ktlint block added in this phase |
| Quick run command (JS) | `pnpm jest` |
| Quick run command (Kotlin) | `cd android && ./gradlew :screen-guard:test` (exact module path to confirm after first prebuild, see Open Question 2) |
| Full suite command | `pnpm jest && cd android && ./gradlew test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FND-01 | App builds and launches on the emulator from a clean checkout | smoke | `npx expo run:android --device emulator-5554` (exit code 0 + `adb shell pidof <package>` non-empty) | ❌ Wave 0 — no scaffold exists yet |
| FND-02 | `prebuild --clean` reproduces the same Android project | smoke/diff | `npx expo prebuild --clean --platform android && git diff --stat android/` (expect empty/expected diff) | ❌ Wave 0 |
| FND-03 | Block-launch spike exercises both paths, result recorded | manual + logcat-assisted | `adb logcat` capture during a scripted `am start` of the test app while the service is enabled via `adb shell settings put secure ...`; manual review of the captured log + screen-record | ❌ Wave 0 — spike code doesn't exist yet |
| FND-04 | ESLint/Prettier/tsc/Jest/ktlint/JUnit each run with one command and pass | unit/lint | `pnpm lint`, `pnpm format:check`, `pnpm tsc --noEmit`, `pnpm jest`, `cd android && ./gradlew ktlintCheck test` | ❌ Wave 0 — none of these configs exist yet |
| FND-05 | `ScreenGuard` contract + shared JSON vectors load in both Jest and JUnit | unit | `pnpm jest modules/screen-guard/src/__tests__/sharedVectors.test.ts`, `cd android && ./gradlew :screen-guard:test --tests "*SharedVectorsLoaderTest*"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** run the specific quick command for whatever this phase's task just touched (e.g., after adding the ESLint config, run `pnpm lint`; after adding the config plugin, run `npx expo prebuild --clean`).
- **Per wave merge:** full suite (`pnpm lint && pnpm format:check && pnpm tsc --noEmit && pnpm jest && cd android && ./gradlew ktlintCheck test`).
- **Phase gate:** Full suite green + the FND-03 spike manually exercised and its result written down (this is a recorded decision, not just a passing test) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `jest.config.js` — does not exist; needs `preset: 'jest-expo'`
- [ ] `eslint.config.js` — does not exist; needs `eslint-config-expo/flat` + custom no-left/right rule
- [ ] `.prettierrc` (or `prettier` config in `package.json`) — does not exist
- [ ] `modules/screen-guard/shared-test-vectors/rule-evaluation.json` — does not exist; even a minimal 1-2-vector stub is sufficient for FND-05's "load" requirement in Phase 1 (full vector coverage is a later-phase concern once real rule types are implemented)
- [ ] `modules/screen-guard/android/build.gradle` ktlint block — does not exist until `create-expo-module --local` runs, then needs the `org.jlleitschuh.gradle.ktlint` plugin (`14.2.0`) added manually
- [ ] Framework install: `npx expo install jest-expo jest`, `pnpm add -D @testing-library/react-native eslint eslint-config-expo prettier typescript@~5.9.3`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase 1 has no auth surface (no Firebase/accounts touched yet) |
| V3 Session Management | No | Not applicable at this phase |
| V4 Access Control | Partial | `BIND_ACCESSIBILITY_SERVICE` permission on the `<service>` declaration ensures only the OS can bind the service — this is the standard, mandatory Android control for accessibility services and is already in the config plugin pattern above; no custom access control code needed |
| V5 Input Validation | Yes | The shared JSON test vectors and any config-plugin-generated XML should be treated as structured data — no user input is parsed in Phase 1 (the spike hard-codes its test-app package name), so this is a placeholder for later phases rather than an active Phase 1 concern |
| V6 Cryptography | No | No secrets or crypto operations in Phase 1 scope |

### Known Threat Patterns for this stack (Phase 1 scope)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A malicious/unrelated app spoofing the `BIND_ACCESSIBILITY_SERVICE` binding | Spoofing | The `android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"` attribute (system-signature-protected permission) on the `<service>` declaration is the standard, non-optional Android mitigation — already included in the config plugin example above; do not omit it |
| Config-plugin-injected native code accidentally requesting overly broad manifest permissions "just in case" during the spike | Elevation of Privilege | Keep the manifest additions scoped exactly to what §13.2 of the product spec lists (accessibility service + `<queries>` for MAIN/LAUNCHER only) — do not add `QUERY_ALL_PACKAGES` or `SYSTEM_ALERT_WINDOW` even temporarily for spike convenience, per the project's own minimal-permissions principle and `PITFALLS.md`'s explicit warning against `SYSTEM_ALERT_WINDOW` as a spike shortcut |
| Accessibility service silently doing more than window-state detection (e.g., reading window content) during spike debugging | Information Disclosure | `android:canRetrieveWindowContent="false"` is set in the XML config from day one (per the code example above) — never flip this to `true` even temporarily for debugging, since it changes the disclosure/consent obligations the later onboarding phase must build around |

## Sources

### Primary (HIGH confidence)
- `npm view expo/create-expo-module/jest-expo/eslint/eslint-config-expo/typescript/prettier version` — live registry queries run this session (2026-09-25), all match project `STACK.md`
- `node ~/.claude/gsd-core/bin/gsd-tools.cjs query package-legitimacy check` — ran this session against all Phase 1 npm packages
- Direct environment verification this session: `node -v`, `java -version`, `adb devices`, `adb shell getprop`, `adb shell pm list packages`, `ls ~/Android/Sdk/{platforms,build-tools,ndk}`, `corepack enable && corepack use pnpm@latest`
- [plugins.gradle.org/plugin/org.jlleitschuh.gradle.ktlint](https://plugins.gradle.org/plugin/org.jlleitschuh.gradle.ktlint) — fetched directly this session, confirms `14.2.0` current
- [eslint.org/docs/latest/rules/no-restricted-syntax](https://eslint.org/docs/latest/rules/no-restricted-syntax) — official ESLint docs
- [developer.android.com/reference/android/os/StrictMode](https://developer.android.com/reference/android/os/StrictMode) — official Android 16 StrictMode API reference
- [docs.expo.dev/config-plugins/dangerous-mods](https://docs.expo.dev/config-plugins/dangerous-mods/), [docs.expo.dev/config-plugins/plugins](https://docs.expo.dev/config-plugins/plugins/), [docs.expo.dev/more/create-expo-module](https://docs.expo.dev/more/create-expo-module/), [docs.expo.dev/more/create-expo](https://docs.expo.dev/more/create-expo/) — official Expo docs
- [expo.dev/blog/out-with-the-old-in-with-the-new-architecture](https://expo.dev/blog/out-with-the-old-in-with-the-new-architecture) — official Expo blog confirming New Architecture mandatory since SDK 55
- This project's own `.planning/research/STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md` (read this session, same-day research, HIGH confidence per their own sourcing)

### Secondary (MEDIUM confidence)
- [droidwin.com — Allow Restricted Settings missing from Sideloaded Apps in Android 13](https://droidwin.com/allow-restricted-settings-missing-from-sideloaded-apps-in-android-13-fix/) — cross-checked against multiple other community sources on the same topic, and against the project's own `PITFALLS.md` Pitfall 7
- [docs.gradle.org SourceSet DSL](https://docs.gradle.org/current/dsl/org.gradle.api.tasks.SourceSet.html), [baeldung.com/gradle-source-sets](https://www.baeldung.com/gradle-source-sets) — official/near-official Gradle documentation on `sourceSets.srcDirs`
- Community Kotlin `AccessibilityService` examples (dev.to/lepresk, Medium) cross-checked against official `AccessibilityService`/`AccessibilityEvent` API references

### Tertiary (LOW confidence)
- None retained without cross-checking — all WebSearch findings in this document were corroborated against at least one official docs source or the project's own same-day research before being cited.

## Metadata

**Confidence breakdown:**
- Standard stack (npm versions): HIGH — every version re-verified live against the npm registry this session, zero drift from `STACK.md`
- Architecture (config plugins, spike cascade, shared vectors): MEDIUM-HIGH — official Expo/Android docs confirm the mechanisms exist and are the recommended approach; exact code shapes (manifest JSON keys, Gradle relative paths) carry `[ASSUMED]` tags where they can only be confirmed after the first real `prebuild` run
- Pitfalls: HIGH — all four Phase-1-specific pitfalls were either directly observed this session (corepack side effect) or are directly sourced from the project's own dated `PITFALLS.md`/`ARCHITECTURE.md`
- BAL spike outcome: UNKNOWN BY DESIGN — this is the literal thing FND-03 exists to determine; no research can resolve it in advance

**Research date:** 2026-09-25
**Valid until:** ~14 days for the npm package versions (fast-moving ecosystem, Expo ships patches frequently); the Android API/BAL policy findings are stable until the next Android developer preview/beta cycle (re-validate per the project's own yearly-re-validation cadence noted in `PITFALLS.md`)
