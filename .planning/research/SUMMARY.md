# Project Research Summary

**Project:** ScreenLimiter  
**Domain:** Android-first (iOS-later) React Native/Expo screen-time limiter & app blocker with parental controls, animated Skia UI, EN/UR i18n, Firebase backend, and free-tier LLM coach  
**Researched:** 2026-09-25  
**Confidence:** HIGH (stack verified live against npm registry and official docs; features cross-checked across 11 competitors; architecture patterns industry-standard; pitfalls sourced from official Play policies and real-world failure reports)

## Executive Summary

ScreenLimiter is a category-leading screen-time app serving two audiences (self-control users and parents) in one cohesive enforcement engine. The technical approach is proven: **native-first enforcement** (Kotlin/AccessibilityService/Room) completely independent of the JS runtime, with a thin Firestore + Cloudflare Worker cloud layer for parental sync. The stack is modern and forward-compatible (Expo SDK 57, React Native 0.86.3, TypeScript 5.9.3, @react-native-firebase for native platform capabilities, Groq+Gemini via OpenAI-compatible endpoints for AI).

**Critical corrections to spec:** (1) Use **@react-native-firebase** (not Firebase JS SDK)—JS SDK lacks Firestore offline persistence on React Native and has no Crashlytics equivalent. (2) **API 36 is the current requirement** (as of Aug 31, 2026), not a future target; RN 0.86.3 defaults to it. (3) **BAL exemption for bound accessibility services is NOT officially documented**—Phase 0 spike must gate the block-screen strategy; permanent fallback (`GLOBAL_ACTION_HOME` + notification) must be production-ready.

## Key Findings

### Recommended Stack

**Core technologies:** Expo SDK 57 (mandates React Native 0.86.3 + New Architecture + Expo Modules API for native modules); TypeScript 5.9.3 (NOT 7.x, which breaks Expo's `app.config.ts`); Android toolchain from RN 0.86.3 (Kotlin 2.1.20, AGP 8.12.0, compileSdk/targetSdk 36, minSdk 24, Gradle 8.13, JDK 17).

**Firebase SDK decision (corrected):** @react-native-firebase v26.4.0 (/app, /auth, /firestore, /messaging, /crashlytics) because: (1) Firestore's `persistentLocalCache()` offline persistence—required for parental-sync source-of-truth—is unsupported in Firebase JS SDK on React Native (no IndexedDB); (2) Crashlytics has no JS SDK equivalent and is spec-required. Worker side continues hand-rolling JWT via `jose` + Web Crypto (`firebase-admin` cannot run on Cloudflare Workers).

**UI/Animation:** Reanimated 4.7.0 + react-native-worklets 0.13.0 + @shopify/react-native-skia 2.13.0 + victory-native 42.0.1. Reanimated 4 split worklets into a separate peer—install both together.

**Backend:** Cloudflare Workers (Hono 4.13.9 + zod 4.6.5) for pairing, FCM, AI proxy. Groq (OpenAI-compatible) primary; Gemini (OpenAI-compatible) fallback. Both via Worker proxy, never called directly from app.

**Installation rule:** Always use `npx expo install` for Expo/RN ecosystem packages. Pin TypeScript @~5.9.3. Maestro is standalone CLI, not npm.

### Expected Features

**Must-have (v1.0):** App discovery, usage tracking (±2 min accuracy), all five limit types with instant apply/remove, native block screen with friction unlock, focus mode, insights, notifications, widgets, basic gamification, parental pairing/remote limits/tamper alerts, AI (suggestions/intent-check/nudges/coach chat/weekly reports), EN + UR with RTL, Play-compliant disclosure + OEM guides.

**Differentiators:** Self and parental modes in one app; "Liquid Time" wave motion language; free-tier AI wired to enforcement; native always-on without paywalled lock mode; first-class Urdu + RTL; doom-scroll nudges; ocean-world gamification.

**Confidence: MEDIUM** (11-competitor cross-check; consensus strong but no official source).

### Architecture Approach

**Standard pattern:** Native enforcement (Kotlin + AccessibilityService + Room + WorkManager + BlockActivity) independent of JS layer, syncing cached rules over cloud relay (Firestore + Cloudflare Worker). Industry-proven, spec encodes correctly.

**Core components:**
- `GuardAccessibilityService`: Event-driven foreground detection, <100ms
- `UsageTracker`: Ground-truth via `UsageStatsManager.queryEvents()` (±2 min accuracy)
- `LimitEngine`: Deterministic rule evaluator, mirrored 1:1 in TS with shared JSON test vectors
- `BlockActivity`: Full-screen block from accessibility service **with mandatory `GLOBAL_ACTION_HOME` fallback**
- `RuleStore` (Room): Single source of truth, survives reboot
- `SyncWorker` + `WatchdogWorker`: WorkManager-scheduled reconciliation
- `ScreenGuardModule`: Expo Modules API bridge (UI-only, not load-bearing)
- Cloudflare Worker (Hono): Stateless relay, signs own JWT, never holds business state
- Firestore: Cross-device sync; clients write directly; Worker mediates pairing/push/AI

**Build order:** (1) ScreenGuard.types.ts + test-vectors first; (2) Phase 0 BAL spike gates architecture; (3) native core before UI depends on real data; (4) Worker google-auth.ts as single module; (5) Firestore security rules before clients write; (6) AI fully decoupled; (7) iOS depends only on frozen contract.

**Confidence: HIGH** except **BAL exemption is MEDIUM-confidence and gating** (not officially documented, tightens every Android release).

### Critical Pitfalls

**Pitfall 1 — isAccessibilityTool misdeclaration:** Keep `false`; build disclosure to Play's exact recipe.

**Pitfall 2 — IsMonitoringTool flag forgotten on closed/internal tracks:** Wire through config plugin for identical generation.

**Pitfall 3 — Families policy nuance:** Address in Play reviewer note that Child mode is parent-configured only.

**Pitfall 4 — API level drift (SPEC IS OUT OF DATE):** API 36 is current requirement (Aug 31, 2026). Re-fetch at Phase 7; don't assume constants.

**Pitfall 5 — 12-testers clock reset:** Recruit 15–18 testers as buffer; account type decided in Phase 0.

**Pitfall 6 — OEM background killing:** Phase 1 needs lightweight real-device smoke test on Xiaomi/Samsung; don't defer all to Phase 7.

**Pitfall 8 — BAL exemption unconfirmed (GATING):** Phase 0 spike determines whether BlockActivity launch or `GLOBAL_ACTION_HOME` fallback is primary. Fallback must be production-ready. Add yearly re-validation.

**Pitfall 9 — LLM quota org-wide:** Phase 6 implements per-user caps + global circuit breaker; load-test at launch concurrency.

**Pitfall 10 — Firestore quota org-wide:** Phase 5 instruments quota monitoring; alert at ~250-active-children threshold.

**Pitfall 11 — Expo prebuild drift:** Phase 0 enforces config-plugin-only discipline; never hand-edit `android/` or `ios/`.

**Confidence: MEDIUM.** Play policies and OEM behavior drift; re-verify release-blocking items at Phase 7.

---

## Implications for Roadmap

Suggested 8-phase structure with clear gates:

**Phase 0: Validation & Toolchain**
- BAL spike gates entire architecture (outcome determines fallback strategy)
- Expo/TS/JDK verified; config-plugin discipline established

**Phase 1: Native Enforcement Core**
- UsageTracker, LimitEngine, BlockActivity, Room, ScreenGuard contract frozen
- Lightweight OEM smoke test (Xiaomi/Samsung) validates watchdog

**Phase 2: Design System & Wave**
- Reanimated/Skia wave components, tokens (including Urdu Nastaliq line-height)
- RTL primitives, battery profile

**Phase 3: Self-Mode Onboarding**
- Play-compliant accessibility disclosure, permissions, OEM guides
- Self-mode UI, focus mode, notifications, widgets scaffold

**Phase 4: Gamification & Widget Spike**
- Ocean world validation; **spike gates widget choice** (Glance vs. react-native-android-widget) vs. battery

**Phase 5: Cloud & Parental**
- Firebase (Auth/Firestore/FCM), Cloudflare Worker (pairing, JWT-signing, FCM)
- Firestore security rules (emulator-tested), quota monitoring

**Phase 6: AI**
- Groq/Gemini proxy, per-user+global quotas
- Suggestions/intent-check/nudges/coach chat/reports, graceful degradation
- Load test at launch concurrency

**Phase 7: Hardening & Release**
- OEM matrix (6+ manufacturers), battery validation
- Play compliance, closed-testing (≥15 testers, 14-day rolling), demo video
- Checklist: re-verify API level, metadata across all tracks

**Phase 8: iOS v2.0**
- Swift implementation against frozen `ScreenGuard` contract; no shared-TS changes

**Research flags:** Phase 0 (BAL spike), Phase 4 (widget choice spike), Phase 5 (Firestore rules review), Phase 6 (provider failover load test), Phase 7 (OEM variance).

**Standard patterns (skip research):** Phase 1 (native), Phase 2 (design system), Phase 3 (Play checklist), Phase 8 (iOS Screen Time API).

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified live 2026-09-25; Firebase SDK decision corrected |
| Features | MEDIUM | 11-competitor cross-check; consensus strong, no official source |
| Architecture | HIGH | Industry-standard patterns; **BAL exception: MEDIUM, gating** |
| Pitfalls | MEDIUM | Official Play + Android docs + 2026 sources; re-verify at Phase 7 |

**Overall: HIGH technical, MEDIUM policy/OEM.** Gating: Phase 0 BAL validation.

### Gaps to Address

- BAL validation (Phase 0 spike outcome determines strategy)
- OEM behavior (real-device testing Phase 1+, emulator insufficient)
- Widget choice (Phase 4 spike resolves Glance vs. react-native-android-widget)
- Quota scaling (launch patterns determine Firestore Blaze upgrade timing)
- Urdu RTL (checklist every UI phase, not just Phase 2)
- Yearly re-validation (BAL, API requirements, Play policies, OEM strategies evolve per release)

## Sources

**Primary (HIGH):** npm registry, React Native gradle catalog, Google Maven, Android Developers docs, Expo changelog, Google Play Console Help, Firebase docs, Cloudflare Workers docs, internal project docs (PRODUCT_SPEC.md, PROJECT.md).

**Secondary (MEDIUM-HIGH):** GitHub maintainer issues (expo/expo, firebase-js-sdk), Code-Hex/firebase-auth-cloudflare-workers, dontkillmyapp.com, analogous open-source apps (OpenScreenTime, zen-mode).

**Tertiary (MEDIUM):** 11-competitor Play/App Store reviews, Trustpilot, 2026 tech blogs (Margelo, Software Mansion, notofonts, Esper, QAwerk), LLM provider endpoints (Groq, Gemini).

---

**Ready for roadmap.** All research synthesized, cross-conflicts resolved. Orchestrator can proceed to requirements definition.
