# Stack Research

**Domain:** Android-first (iOS-later) React Native/Expo screen-time limiter & app blocker — self-control + parental-control modes, animated Skia UI, EN/UR i18n with RTL, Firebase + Cloudflare Worker backend, free-tier LLM coach.
**Researched:** 2026-09-25
**Confidence:** HIGH overall for concrete package/toolchain versions (verified live against npm registry, Google's Maven repo, and official Android/Expo docs on 2026-09-25). MEDIUM for two judgment calls flagged explicitly below (Android widget engine, exact free-tier AI quotas).

All versions below were checked live today (`npm view <pkg> version`, Google's `dl.google.com/android/maven2/.../maven-metadata.xml`, and official docs/changelogs) — not recalled from training data. Where a range is inherently unstable (free-tier request quotas, canary SDKs), that is called out explicitly rather than stated as a fixed fact.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Expo SDK** | **57** (`expo@57.0.25`) | App framework, prebuild, Expo Modules API, config plugins | Current stable SDK line (SDK 58 is only in `-preview`/canary as of today — not production-ready). SDK 57 bundles React Native 0.86 and mandates the New Architecture with no opt-out (mandatory since SDK 55), which matches the project's plan to build ScreenGuard as an Expo Module (Turbo Modules/Fabric only — no legacy bridge path exists anymore). |
| **React Native** | **0.86.3** (bundled by Expo SDK 57; standalone `react-native@latest` is already 0.87.1 — SDK 57 deliberately trails by one "no-breaking-changes" release, which is intentional per Expo's release strategy) | Cross-platform runtime | Verified directly from RN 0.86.3's own published `gradle/libs.versions.toml` (see Android toolchain below) — this is the exact version Expo SDK 57 ships. |
| **React** | 19.2.x | UI library | Bundled/pinned by Expo SDK 57 (unchanged from SDK 56). |
| **TypeScript** | **5.9.3** — NOT the npm "latest" tag (7.0.2) | Static typing, strict mode | Expo's own tooling is built and tested against TypeScript ^5.9.3 (`@tsd/typescript` in `expo`'s devDependencies), and there is an open, confirmed bug where Expo fails to compile `app.config.ts` under TypeScript 7's native compiler (`expo/expo#47627`). TS 7.0 also lacks a stable programmatic API needed by some Babel/Metro tooling. Pin `~5.9.3`; revisit TS 7 only once Expo/Metro officially certify it (tracked, not yet done as of SDK 57). |
| **Expo Modules API** | ships with `expo-modules-core@57.0.19` | Typed native module authoring (Kotlin now, Swift for v2.0) | This is the only supported path for custom native modules under the mandatory New Architecture — there is no bridge-based ("old architecture") fallback anymore. Matches the spec's `ScreenGuard` native-module contract exactly. |
| **Expo Router** | 57.0.23 | File-based navigation | Matches the `app/` route-group structure already laid out in the spec (§9). Peer-requires `react-native-screens ^4.26.0`, `react-native-safe-area-context >=5.4.0`, `react-native-gesture-handler` — install these via `npx expo install`, not bare `npm install`, so SDK-compatible versions are chosen (see Version Compatibility). |

### Native Android Toolchain (Kotlin side)

These are **not npm packages** — verified directly from React Native 0.86.3's own published Gradle version catalog (`gradle/libs.versions.toml` inside the `react-native@0.86.3` npm tarball) and from Android's official AGP release notes. This is the ground truth for what Expo's prebuild will generate for SDK 57 unless overridden via `expo-build-properties`.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Kotlin** | 2.1.20 | Native module + LimitEngine/Room/WorkManager code | RN 0.86.3's pinned `kotlin` version. |
| **Android Gradle Plugin (AGP)** | 8.12.0 | Android build system | RN 0.86.3's pinned `agp` version. **Requires Gradle 8.13 (min = default) and JDK 17 (min = default).** |
| **Gradle** | 8.13 | Build tool | Minimum/default required by AGP 8.12.0 (verified on `developer.android.com/build/releases/agp-8-12-0-release-notes`). |
| **compileSdk / targetSdk** | 36 (Android 16) | Android API surface | RN 0.86.3's default. This already satisfies Google Play's Aug 31, 2026 requirement that new apps/updates target API 36 (see Compliance note below) — no manual bump needed. |
| **minSdk** | 24 (Android 7.0) | Minimum supported OS | RN 0.86.3's default — matches the spec's own "Android 7 → latest" compatibility requirement exactly, no override needed. |
| **buildTools** | 36.0.0 | Android build tools | RN 0.86.3's default. Dev machine has 36.1 installed — newer, compatible. |
| **NDK** | 27.1.12297006 (RN default) | Native code compilation | Dev machine has NDK 29 installed (newer). No conflict; Expo/RN will use its pinned 27.x unless you explicitly raise it via `expo-build-properties`. There is no reason to force NDK 29 for this project (no native C++ beyond what RN itself needs). |
| **androidx.room** | **2.8.5** (stable) | Local persistence: `rules`, `grants`, `usage_daily`, `usage_sessions`, `block_events`, `native_strings` | Verified via Google's Maven metadata (`dl.google.com/android/maven2/androidx/room/room-runtime/maven-metadata.xml`). Note: Google announced "Room 3.0" in March 2026 as a KMP-oriented rewrite; **Room 2.x is now in maintenance mode** but 2.8.5 is the current production-stable line. Do not adopt Room 3.0 for a Kotlin-only, non-KMP Android module yet — stay on 2.8.5 until 3.0 has a track record post-stable. |
| **androidx.work (WorkManager)** | **2.12.0** (stable) | `SyncWorker` (15-min pull/push), `WatchdogWorker`, weekly report scheduling | Verified via Google's Maven metadata. |
| **androidx.glance / glance-appwidget** | 1.2.0 (stable); 1.3.0 is alpha-only | Native home-screen widgets (if Glance is chosen — see Widgets below) | Verified via Google's Maven metadata. |

### AI Providers

| Technology | Version / Endpoint | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Groq** (primary) | OpenAI-compatible endpoint: `https://api.groq.com/openai/v1` | Coach chat, suggestions, intent check, reports | Point the OpenAI SDK's `baseURL` at this endpoint with a Groq key; existing chat-completions code works unchanged. Free tier is commonly cited (2026) as ~14,400 req/day / 30 req/min on the small/fast models, much lower daily caps on large or reasoning models — **treat these numbers as directional, not contractual**: Groq's limits are per-account, shared across all app users (as the spec itself already notes), and providers routinely retune free-tier caps. Confirm the exact current numbers for the specific model IDs you pick at Worker-build time via `console.groq.com/docs/rate-limits`, and build the quota system (spec §8.1) to degrade gracefully rather than hard-coding a number. |
| **Google Gemini** (fallback) | OpenAI-compatible endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/` | Automatic failover on Groq 429/5xx | Same OpenAI-SDK-compatible pattern — swap `baseURL`, API key, and model name only. Keep the trailing slash on the base URL (a documented gotcha — omitting it causes 404s). |
| ~~xAI Grok~~ | — | — | Confirmed no free tier as of 2026 (paid-credits-only after signup) — correctly excluded already in PROJECT.md/spec. Do not reconsider unless the monetization model changes. |

### Backend (Cloudflare Worker)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Hono** | 4.13.9 | Router/middleware for the Worker (`/pair/*`, `/notify`, `/ai/*`) | Verified current npm version. Minimal, edge-native, zero-dependency-friendly — the standard choice for Cloudflare Workers in 2026. |
| **zod** | 4.6.5 | Request/response schema validation, AI structured-output validation (spec §8.4) | Current major version; Worker code should target zod v4's API (some v3 patterns like `.merge()` behavior changed — verify against v4 docs during Phase 5/6 implementation, not v3 muscle memory). |
| **wrangler** | 4.140.0 | Worker CLI (dev, deploy, secrets, D1/KV) | Current CLI; matches Workers' 2026 runtime. |
| **@cloudflare/workers-types** | 5.20260925.1 | TypeScript types for the Workers runtime | Dated versioning scheme (ties to a runtime compat date) — repin periodically, don't "set and forget." |
| **jose** | latest (check at implementation time) | Sign JWTs with the Firebase service-account key via Web Crypto, and exchange for OAuth2 access tokens (FCM HTTP v1) / mint Firebase custom tokens (pairing) | **Cloudflare Workers cannot run `firebase-admin`** (depends on Node's `crypto`/`fs`, unavailable on Workers) — this was already independently confirmed in this project's `ARCHITECTURE.md` research. `jose` is the standard WebCrypto-portable JWT library for exactly this pattern; multiple independent open-source implementations (e.g. `Code-Hex/firebase-auth-cloudflare-workers`) do the same thing, corroborating feasibility. Build this as one shared signing utility used for both FCM-token exchange and pairing custom tokens (already recommended in ARCHITECTURE.md — reinforcing that here since it's a stack/library choice, not just an architecture pattern). |
| **Vitest** + **@cloudflare/vitest-pool-workers** | 5.0.2 / 0.22.0 | Worker unit/integration tests | This is the current (2026) way to get what the product spec calls "Vitest + Miniflare" (§20) — `@cloudflare/vitest-pool-workers` runs tests inside the actual `workerd` runtime (Miniflare is now used internally by this pool, not wired up separately) and is Cloudflare's officially recommended Worker-testing setup. |

### Firebase — client SDK choice (flagging a conflict with the existing research)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **@react-native-firebase** (`/app`, `/auth`, `/firestore`, `/messaging`, `/crashlytics`) | `/app` currently 26.4.0 (pin the same major across all `@react-native-firebase/*` sub-packages) | Firebase Auth, Firestore (+ offline persistence), FCM, Crashlytics from the RN app | **Recommended over the plain `firebase` JS SDK (`firebase@12.19.0`) — this is a deliberate correction, not a restatement of PROJECT.md, which only says "Firebase" without naming an SDK, and it disagrees with this project's own `ARCHITECTURE.md` diagram, which assumed the JS SDK for the client.** Two hard, verified reasons: (1) **Firestore's `persistentLocalCache()` offline persistence is not supported by the Firebase JS SDK on React Native** — it requires IndexedDB, which RN does not have (cross-checked against three independent `firebase-js-sdk` GitHub issues: #7947, #436, #2973). The product spec explicitly requires "Firestore (+ offline persistence)" as the parental-sync source of truth (§12.3, §15.1) — this is a hard requirement the JS SDK cannot satisfy on RN, only a workaround-your-own-cache approach could, which is strictly worse than a maintained SDK. (2) **Crashlytics has no Firebase JS SDK equivalent at all** — Expo's own "Using Firebase" guide names Crashlytics as one of the specific reasons to choose React Native Firebase over the JS SDK. Since the spec requires Crashlytics (§21), the JS SDK is a non-starter regardless of the persistence issue. The usual reason to prefer the JS SDK in Expo-land — Expo Go compatibility — does not apply here: this project is already committed to prebuild/dev-builds (custom `ScreenGuard` Expo Module), so there is no Expo-Go constraint left to protect. |
| ~~firebase (JS SDK)~~ | 12.19.0 | — | Do not use as the app-side SDK for the reasons above. It remains the *only* option if the team ever needs a pure-web build (not in scope for this project) — not applicable here. |

**Action for roadmap:** update `ARCHITECTURE.md`'s client-side box from "Firebase JS SDK" to "@react-native-firebase" — the Worker-side finding in that file (no `firebase-admin` on Workers, hand-roll JWT via WebCrypto/`jose`) is unaffected and still correct; that constraint is about the *Worker* runtime, not the app client, and both documents agree on it.

### Supporting Libraries — UI, Animation & Charts

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react-native-reanimated** | 4.7.0 | UI-thread animations (waves, dial, ripple theme switch) | Peer-requires `react-native: "0.86 - 0.88"` (fits RN 0.86.3 exactly) **and** `react-native-worklets: "0.13.x"` as a separate peer package — Reanimated 4 split its JS-runtime/worklets engine out into the standalone `react-native-worklets` package. Always install both together. |
| **react-native-worklets** | 0.13.0 | Worklet runtime that Reanimated 4 and Skia both depend on | Required peer for Reanimated 4.x and Skia 2.x — do not try to use Reanimated 4 without it. |
| **@shopify/react-native-skia** | 2.13.0 | `LiquidWave`, `WaveRing`, `WaveBackground`, `DurationDial`, ripple theme transition, chart rendering surface | Peer-requires `react >= 19`, `react-native >= 0.78`, `react-native-worklets >= 0.7.0`, `react-native-reanimated >= 4.0.0` — all satisfied by the versions above. |
| **victory-native** | 42.0.1 | Insights charts (today/week/month, heatmap) | This is the FormidableLabs "victory-native-xl" Skia/Reanimated/D3 rewrite, now published simply as `victory-native` (confirmed via its own `package.json` repository field: `FormidableLabs/victory-native-xl`) — do not confuse with the pre-2023 SVG-based `victory-native`. Peer-requires `@shopify/react-native-skia: ">=2.6.0 <3.0.0"` (2.13.0 fits) and `react-native-reanimated >=3.19.1`. |
| **lottie-react-native** | 7.5.0 | `OceanWorld` growth animations, celebratory confetti-bubbles | Peer-requires `react-native >= 0.84`, `react >= 19.2`. Version 7.x also peer-lists `@lottiefiles/dotlottie-react ^0.13.5` if you want `.lottie` (dotLottie) format support in addition to classic `.json` Lottie files — optional, only add it if you actually ship `.lottie` assets. |
| **moti** | 0.30.0 | Declarative animation sugar over Reanimated (already named in PROJECT.md's planned stack) | Peer-requires `react-native-reanimated` only — thin wrapper, safe to add for simple enter/exit/stagger animations without hand-writing worklets each time; drop it if the team prefers raw Reanimated everywhere. |
| react-native-gesture-handler / react-native-screens / react-native-safe-area-context | 3.3.0 / 4.28.0 / 5.10.0 | Required transitively by Expo Router + Reanimated + Skia gesture handling | Install via `npx expo install`, do not hand-pin — Expo Router's own peerDependencies specify a floor (`react-native-screens >=4.26.0`, `react-native-safe-area-context >=5.4.0`); let the Expo CLI resolve the exact compatible patch. |

### Supporting Libraries — State, Storage & i18n

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zustand** | 5.0.15 | UI-prefs mirror, rules mirror hydrated from native, reactive stores | Peer-requires `react >= 18` and `use-sync-external-store >= 1.2.0` (auto-satisfied by React 19). The `immer` peer is *optional* — only needed if you opt into zustand's immer middleware; don't add `immer` as a dependency unless you actually use that middleware. |
| **react-native-mmkv** | 4.3.2 | Fast synchronous KV for theme/language/mode/onboarding flags | **Now built on Nitro Modules** (a rewrite from the older JSI-direct implementation) — it peer-requires `react-native-nitro-modules` (current: 0.37.1) as a separate package. Install both; this is a change from older MMKV tutorials that assumed no extra peer package. |
| **i18next** | 26.4.2 | i18n core | — |
| **react-i18next** | 17.0.15 | React bindings | — |
| **expo-localization** | 57.0.2 | Device locale detection for the language picker default | Peer-requires `expo` only. |
| **i18next-icu** | 2.4.4 | ICU MessageFormat plural/select syntax in translation strings | Peer-requires `intl-messageformat: ">=10.3.3 <12.0.0"` — pin `intl-messageformat` explicitly rather than letting it float, since the peer range excludes v12+. Note: Hermes has shipped full `Intl`/ICU support on Android since RN 0.65–0.70 (collaboration with Microsoft) — RN 0.86 needs **no extra config or polyfill** for `Intl.PluralRules`/`Intl.DateTimeFormat`/`Intl.NumberFormat`/`Intl.RelativeTimeFormat`. `i18next-icu` is for translation-string plural/select *syntax* convenience on top of that, not a prerequisite for `Intl` itself. |

### Supporting Libraries — Testing & QA

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **jest-expo** | **57.0.5 or newer — not 57.0.0** | Jest preset (domain unit tests, RTL component tests) | SDK 57.0.0's `jest-expo` shipped with a confirmed, now-fixed bug (`expo/expo#47435`): its peer `@react-native/jest-preset@^0.85.0` conflicted with RN 0.86.0. `jest-expo@57.0.5`'s peer is correctly `@react-native/jest-preset: "^0.86.3"` — pin `>=57.0.5`. Install with `npx expo install jest-expo jest` (not a manual `npm i jest@latest`) — Expo's installer resolves a mutually-compatible root `jest` version instead of the bare npm "latest" tag. |
| ~~jest@30.5.2 (npm "latest")~~ | — | — | **Do not hand-install.** `jest-expo@57.0.5`'s own dependencies (`babel-jest`, `jest-snapshot`, `@jest/globals`) are pinned to `^29.2.1` internally. Let `npx expo install jest-expo jest` pick the paired root `jest` version for SDK 57 rather than adding `jest@30` yourself. |
| **@testing-library/react-native** | 14.0.1 | Component tests, RTL rendering, theme snapshot tests | Peer-requires `jest >= 29.0.0`, `react-native >= 0.78`, `react >= 19.0.0` — all satisfied. |
| **JUnit / Robolectric / Mockito** | 4.13.2 / 4.15.1 / 3.12.4 (+ `mockito-kotlin` 3.2.0) | Kotlin native unit tests (`UsageTracker`, Room DAOs, `LimitEngine`) | These come from RN 0.86.3's own Gradle version catalog — Expo's prebuild wires them in automatically; no manual version hunting needed unless you add a Robolectric test outside the generated Android project structure. |
| **Maestro** | current CLI (2026; actively maintained by mobile.dev, now shipping Maestro Studio / MaestroGPT / an MCP server for AI-driven flow generation) | E2E flows: onboarding, set→exceed→block→remove→usable, pairing, more-time request | **Important gotcha:** the npm package literally named `maestro` (`npm view maestro` → "a framework for quickly bootstrapping serverless orchestration workflows with AWS Step Functions") is an **unrelated package** — do not `npm install maestro`. mobile.dev's Maestro is **not distributed via npm**; install the real CLI via `curl -Ls "https://get.maestro.mobile.dev" \| bash` (or the equivalent documented installer) as a standalone binary, matching how the spec already describes it (`e2e/` Maestro flow files, not an npm dependency). |
| **Firebase Local Emulator Suite** + **@firebase/rules-unit-testing** | 5.0.2 | Firestore security-rules unit tests (spec §15.3, §20) | Run against the emulator, not production Firestore, in CI. |

### Android Widgets — a decision, not just an option (spec defers this to a Phase 4 spike)

| Option | Verdict | Why |
|--------|---------|-----|
| **Jetpack Glance** (`androidx.glance:glance-appwidget:1.2.0`, native Kotlin/Compose) | **Recommended default hypothesis for the Phase 4 spike** | The project's own hard constraints — battery budget < 2%/day, widget refresh every 15 min (spec §6.10), and the stated architecture principle that critical/scheduled behavior should not depend on the JS runtime — all point toward native. `react-native-android-widget` renders widget content through a hidden/headless React Native surface on each scheduled update, which means spinning up a JS context (bundle load + bridge/JSI init) every 15 minutes purely to redraw a widget — a real, measurable battery/latency cost for something this frequent. Glance also lets the widget read directly from the same Room database and be driven by the same `WorkManager` jobs the native `SyncWorker`/`WatchdogWorker` already use, with zero cross-runtime hop. The team is already writing substantial native Kotlin (BlockActivity, LimitEngine, Room, WorkManager) — Glance is incremental cost on a skillset already being built, not a third paradigm. |
| **react-native-android-widget** (0.22.1, supports New Architecture) | Fallback if the Phase 4 spike shows Glance's dev-velocity cost is too high for the team, or if widget visual complexity needs to closely mirror in-app RN/Skia components pixel-for-pixel | Legitimate choice if iteration speed on widget *design* (reusing existing RN components/design tokens directly) matters more than the periodic JS-context cost at this specific update cadence (15 min, not seconds) — validate the actual battery delta empirically in the spike rather than assuming it's disqualifying. |

**Confidence: MEDIUM** — this is an architecture/engineering judgment call informed by the project's stated battery and JS-independence constraints, not a fact with one verifiable right answer. Treat the Phase 4 spike (already planned in the roadmap) as the actual decision gate; this is the informed starting hypothesis to spike against.

### iOS-Later (v2.0 — architecture-ready, not built yet)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@bacons/apple-targets** | 5.0.0 | Expo config-plugin-managed iOS extension targets (`DeviceActivityMonitor`, `ShieldConfiguration`, `ShieldAction`, `DeviceActivityReport`) sharing an App Group | Only needed when Phase 8 (iOS) starts. Confirms the spec's own choice (§14.3) is current and maintained. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager (per spec §21) | Expo CLI's `npx expo install` natively detects and works with pnpm-managed repos in current Expo CLI versions — no special flag needed as of SDK 57. |
| **eslint-config-expo** | 57.0.2 | Lint baseline matching SDK 57 | Pair with `eslint@10.x` — verify the flat-config migration (`eslint-config-expo` moved to ESLint 9+ flat config in recent majors); don't mix old `.eslintrc` style config with a flat-config-only preset. |
| **prettier** | 3.9.9 | Formatting | — |
| **ktlint / detekt** | latest at implementation time | Kotlin lint/format for the native module and app code | Per spec §21 — no npm version to pin; use whatever current Gradle-plugin version pairs with Kotlin 2.1.20/AGP 8.12.0. |
| **`npx expo install` (not raw `npm install`)** | The single most important tooling habit for this stack | Expo CLI's installer consults SDK 57's own maintained compatibility registry, which is more authoritative than individual packages' npm `peerDependencies` ranges — those sometimes lag (e.g., `expo-modules-core@57.0.19`'s peer range for `react-native-worklets` is `^0.7.4 \|\| ^0.8.0 \|\| ^0.9.0 \|\| ^0.10.0`, which does **not** yet list `0.13.x` even though `react-native-reanimated@4.7.0` requires exactly `0.13.x`). This is a real, currently-observable peer-range drift — don't let a `npm ls` peer warning about this specific pair cause alarm or block the install; trust `expo install`'s resolution over raw peerDependency ranges for anything in the Expo/RN ecosystem. |

---

## Installation

```bash
# Core (via Expo's compatibility-aware installer — always prefer this over bare npm/pnpm add
# for anything in the Expo/RN ecosystem)
npx create-expo-app@latest ScreenLimiter --template blank-typescript
cd ScreenLimiter

npx expo install \
  expo-router expo-localization expo-font expo-updates \
  react-native-reanimated react-native-worklets \
  react-native-gesture-handler react-native-screens react-native-safe-area-context \
  @shopify/react-native-skia victory-native \
  lottie-react-native moti \
  react-native-mmkv react-native-nitro-modules \
  expo-build-properties

# State, i18n, validation (no Expo-specific pinning needed, but keep versions current)
pnpm add zustand zod i18next react-i18next i18next-icu intl-messageformat@">=10.3.3 <12.0.0"

# Firebase — React Native Firebase, NOT the plain `firebase` JS SDK (see rationale above)
pnpm add @react-native-firebase/app @react-native-firebase/auth \
  @react-native-firebase/firestore @react-native-firebase/messaging \
  @react-native-firebase/crashlytics

# TypeScript — pin the 5.x line explicitly, do not let it float to the npm "latest" (7.x) tag
pnpm add -D typescript@~5.9.3

# Testing (let Expo pick the paired jest version — do not add jest@latest by hand)
npx expo install jest-expo jest
pnpm add -D @testing-library/react-native

# Worker (separate package inside backend/worker/)
cd backend/worker
pnpm add hono zod jose
pnpm add -D wrangler vitest @cloudflare/vitest-pool-workers @cloudflare/workers-types
```

Maestro (E2E) is **not** an npm install — see the Testing & QA table above; install the standalone CLI binary.

Native Android versions (Kotlin 2.1.20, AGP 8.12.0, compileSdk/targetSdk 36, minSdk 24) are generated by `expo prebuild` from RN 0.86.3's own defaults — no manual Gradle version editing needed unless you intentionally override via `expo-build-properties` in `app.json`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @react-native-firebase | Firebase JS SDK (`firebase`) | Only if this were a pure Expo-Go / no-native-code project with no Crashlytics and no need for real Firestore offline persistence — not this project (custom native module + explicit offline-persistence + Crashlytics requirements rule it out). |
| Jetpack Glance (widgets) | react-native-android-widget | If the Phase 4 spike shows the periodic JS-context cost is negligible in practice and the team values reusing RN/Skia design components directly in widget UI over native Kotlin/Compose. |
| Maestro | Detox | Detox is a legitimate, more deeply-integrated alternative (in-process instrumentation vs Maestro's black-box driver), but has heavier native build configuration and is typically more CI-flaky for apps this dependent on Accessibility Service state and system UI (block screen, permission dialogs) that live outside the app's own view hierarchy — Maestro's OS-level/black-box approach handles that more naturally. Spec already chose Maestro; this confirms it's still the right call in 2026. |
| Room 2.8.5 | Room 3.0 (KMP-oriented rewrite, announced March 2026) | Revisit only once this is a Kotlin Multiplatform project (it isn't — Android-only native module) or once Room 3.0 has a longer stable track record; adopting a brand-new major version for the enforcement-critical local database on day one is unnecessary risk. |
| TypeScript 5.9.3 | TypeScript 7.0 (native/Go compiler) | Once Expo/Metro/Babel tooling officially certify compatibility (tracked via `expo/expo#47627`) — the 10x compile-speed win is real and worth revisiting later, just not at SDK 57. |
| Groq + Gemini (OpenAI-compatible) | A single-provider SDK (`@google/generative-ai`, Groq's own SDK) | Only if you're certain you'll never need failover — the whole point of routing both through the OpenAI-compatible chat-completions shape is that the Worker's provider-swap logic (spec §8.1) becomes a `baseURL`/key/model swap, not two different request/response shapes to reconcile. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `firebase` (JS SDK) as the RN app's primary Firebase client | No Firestore offline persistence on React Native (no IndexedDB — confirmed across 3 independent `firebase-js-sdk` GitHub issues); no Crashlytics equivalent at all | `@react-native-firebase/*` |
| TypeScript `latest` (currently 7.0.2) | Confirmed Expo build-time incompatibility (`app.config.ts` fails to compile); Expo's own tooling is pinned to TS 5.9.x | TypeScript `~5.9.3` |
| Manually installing `jest@latest` (30.x) alongside `jest-expo` | `jest-expo@57.0.5`'s internal deps (`babel-jest`, `jest-snapshot`, `@jest/globals`) are pinned to Jest 29.x; a hand-installed Jest 30 root package can desync from the preset | `npx expo install jest-expo jest` and let Expo pick the paired version |
| `jest-expo@57.0.0` specifically | Confirmed peer-dependency bug against RN 0.86.0 (`expo/expo#47435`), fixed by 57.0.5 | `jest-expo@>=57.0.5` |
| The npm package literally named `maestro` | It is an unrelated AWS Step Functions orchestration library, not mobile.dev's Maestro | Install mobile.dev's Maestro CLI via its own installer script, not npm |
| xAI Grok as an AI provider | No free tier (paid credits only) — already correctly excluded in PROJECT.md | Groq (primary) + Gemini (fallback), both OpenAI-compatible |
| `firebase-admin` in the Cloudflare Worker | Depends on Node's `crypto`/`fs`, unavailable in the Workers runtime — will fail at deploy/runtime, not just lint | `jose` + Web Crypto (`SubtleCrypto`) for JWT signing / OAuth2 token exchange, as already validated in this project's `ARCHITECTURE.md` |
| Legacy bridge-based ("old architecture") native modules for `ScreenGuard` | Expo SDK 55+ made the New Architecture mandatory with no opt-out — old-architecture native module patterns from pre-2025 tutorials will not work | Expo Modules API targeting Turbo Modules/Fabric (which is what the spec already assumes) |
| Standalone `react-native-android-widget` as the unquestioned default | Renders through a headless RN JS context on every scheduled 15-min update — real battery/latency cost for a background-only surface | Default to native Jetpack Glance; fall back to `react-native-android-widget` only if the Phase 4 spike says otherwise |

## Stack Patterns by Variant

**If building a quick internal prototype/spike (e.g., Phase 0's blocking spike) before the full stack is wired up:**
- Skip Firebase, i18n, and charting libraries entirely — the Phase 0 goal is just accessibility-service + `BlockActivity` + Room, all native Kotlin, no JS dependency by design.
- Do not add `@react-native-firebase` or any cloud dependency until Phase 5 (Cloud & parental) — adding it earlier just adds prebuild/config surface with nothing yet depending on it.

**If the Phase 4 widget spike shows Glance's Kotlin/Compose learning curve is a bigger velocity hit than expected:**
- Fall back to `react-native-android-widget@0.22.1` (already New-Architecture-compatible) rather than delaying the widget feature — a JS-rendered widget updating every 15 minutes is a real but likely-tolerable battery cost; measure it before ruling either option out on theory alone.

**If Room 3.0 reaches a mature stable release well before this project ships:**
- Re-evaluate only if there's a concrete reason (e.g., a KMP push for shared iOS/Android persistence code) — for a single-platform Android Room database backing native enforcement, staying on the mature 2.x line is lower-risk, not lower-capability.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `expo@57.0.25` | `react-native@0.86.3`, `react@19.2.x` | Verified: SDK 57's changelog states RN 0.86; RN 0.86.3 is the current stable patch on that minor. |
| `react-native-reanimated@4.7.0` | `react-native: "0.86 - 0.88"` **and** `react-native-worklets: "0.13.x"` | Both must be installed together — Reanimated 4 extracted its worklets runtime into a separate package. |
| `@shopify/react-native-skia@2.13.0` | `react-native-reanimated >=4.0.0`, `react-native-worklets >=0.7.0`, `react >=19` | All satisfied by the pins above. |
| `victory-native@42.0.1` | `@shopify/react-native-skia: ">=2.6.0 <3.0.0"`, `react-native-reanimated >=3.19.1` | 2.13.0 fits the `<3.0.0` ceiling — do not upgrade Skia to a hypothetical 3.x without re-checking victory-native's peer range first. |
| `react-native-mmkv@4.3.2` | `react-native-nitro-modules` (peer, any recent version — currently 0.37.1) | MMKV 4.x is Nitro-Modules-based, not the older direct-JSI implementation; install the peer explicitly. |
| `jest-expo@57.0.5+` | `@react-native/jest-preset: "^0.86.3"` | Matches RN 0.86.x. `jest-expo@57.0.0` had a broken peer range (`^0.85.0`) against RN 0.86.0 — avoid that exact patch. |
| AGP `8.12.0` | Gradle `8.13` (min/default), JDK `17` (min/default) | **No conflict with the dev machine's JDK 17** (`~/.local/jdk/jdk-17`) — this was the specific risk flagged for verification, and it checks out clean. Do not upgrade the dev machine's JDK for this SDK/AGP pairing; JDK 17 is both the minimum and the default AGP expects. |
| Play Store target API requirement | API 36 (Android 16) required for new apps/app updates from **Aug 31, 2026** (extension to Nov 1, 2026 available on request) | RN 0.86.3's own `targetSdk` default is already 36 — this project satisfies the 2026 requirement with zero extra configuration, purely by being on a current Expo SDK. |
| Node.js | RN 0.86.3 requires `^20.19.4 \|\| ^22.13.0 \|\| ^24.3.0 \|\| >=25.0.0` | Dev machine's Node 24 (via nvm) satisfies `^24.3.0` as long as the installed 24.x patch is ≥24.3.0 — verify with `node -v` before first install; nvm's "Node 24" default alias should already be well past that patch by late 2026. |

---

## Sources

- `npm view <package> version / peerDependencies / engines / dependencies` (live registry queries, run 2026-09-25) — HIGH confidence, for: expo, react-native, expo-router, react-native-reanimated, react-native-worklets, @shopify/react-native-skia, victory-native, react-native-mmkv, react-native-nitro-modules, zustand, lottie-react-native, moti, i18next, react-i18next, expo-localization, i18next-icu, @react-native-firebase/app, firebase, hono, zod, wrangler, @cloudflare/workers-types, vitest, @cloudflare/vitest-pool-workers, jest-expo, jest, @testing-library/react-native, @bacons/apple-targets, react-native-android-widget, typescript, eslint-config-expo, prettier.
- `https://unpkg.com/react-native@0.86.3/gradle/libs.versions.toml` (fetched raw file directly from the published npm package) — HIGH confidence, source of the exact Kotlin/AGP/compileSdk/targetSdk/minSdk/buildTools/NDK/Room-adjacent Jetpack versions RN 0.86.3 ships.
- `https://dl.google.com/android/maven2/androidx/room/room-runtime/maven-metadata.xml`, `.../androidx/work/work-runtime-ktx/maven-metadata.xml`, `.../androidx/glance/glance-appwidget/maven-metadata.xml` (Google's official Maven index) — HIGH confidence, live version lists for Room/WorkManager/Glance.
- `https://developer.android.com/build/releases/agp-8-12-0-release-notes` — HIGH confidence, official AGP 8.12 JDK/Gradle/SDK requirements.
- `https://support.google.com/googleplay/android-developer/answer/11926878` and cross-checked coverage (Median.co, targetsdk.com, multiple 2026 blog posts) — HIGH confidence on the Aug 31, 2026 API-36 target requirement and Nov 1, 2026 extension.
- `https://expo.dev/changelog/sdk-57` — HIGH confidence, official Expo SDK 57 changelog (RN 0.86, React 19.2, New Architecture status).
- `expo/expo#47435` and `#47627` (GitHub issues) — MEDIUM-HIGH confidence (maintainer-tracked, publicly confirmed bugs): jest-expo/RN 0.86 peer conflict (fixed by 57.0.5) and TypeScript 7/`app.config.ts` incompatibility.
- `firebase/firebase-js-sdk` GitHub issues #7947, #436, #2973 (cross-checked, independently corroborating) — HIGH confidence: Firestore JS SDK offline persistence is unsupported on React Native (no IndexedDB).
- `https://docs.expo.dev/guides/using-firebase/` — HIGH confidence, official Expo guidance naming Crashlytics as a reason to choose React Native Firebase over the JS SDK.
- `console.groq.com/docs/openai`, `ai.google.dev/gemini-api/docs/openai` and cross-checked 2026 community sources — HIGH confidence on the two OpenAI-compatible base URLs; MEDIUM confidence on exact free-tier request/token numbers (these are provider-controlled and change; the spec already anticipates re-verifying at implementation time).
- `maestro.dev`, `qaskills.sh` 2026 coverage — MEDIUM confidence (multiple, mutually consistent 2026 sources) that Maestro (mobile.dev) is actively maintained and not npm-distributed; directly corroborated by this project's own `npm view maestro` returning an unrelated AWS package.
- This project's own `.planning/research/ARCHITECTURE.md` (sibling research file, read for consistency) — used to confirm the Worker-side `firebase-admin`-unavailable finding and to identify/flag the client-SDK disagreement corrected above.

---
*Stack research for: Android-first React Native/Expo screen-time limiter with parental controls, Skia animation, EN/UR i18n, Firebase + Cloudflare Worker backend, free-tier LLM coach*
*Researched: 2026-09-25*
