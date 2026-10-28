# Architecture Research

**Domain:** Android-first (iOS-later) React Native/Expo screen-time limiter with native enforcement + parental sync
**Researched:** 2026-09-25
**Confidence:** HIGH overall (native enforcement patterns, Expo Modules API, iOS Screen Time API); MEDIUM on the Cloudflare-Worker-as-Firebase-backend pattern (community-verified, not officially supported by Firebase SDKs); **one spec claim corrected below with MEDIUM confidence** (background-activity-launch exemption for accessibility services).

This app-blocker/parental-control domain has one dominant, well-proven architecture shape: **native enforcement engine that never depends on the app's UI process, syncing a locally-cached rule set over a thin cloud relay.** ScreenLimiter's spec (§12–16) already follows this shape correctly in almost every respect. The findings below validate the overall design, correct one specific technical claim, and flag a handful of risks that should shape phase sequencing.

---

## Standard Architecture

### System Overview

```
┌─────────────────────────── React Native app (TypeScript, JS runtime) ───────────────────────────┐
│  UI (Expo Router/Skia/Reanimated) │ i18n/Theme │ Zustand (rules MIRROR, not source of truth)     │
│  Domain (pure TS): rule evaluator reference impl, zod validation, scheduling helpers             │
│  Services: ScreenGuard client │ Sync (Firestore SDK) │ AI client (fetch to Worker) │ Notifications│
└───────────────┬───────────────────────────────┬──────────────────────────┬───────────────────────┘
                │ ScreenGuard (Expo Module,       │ Firebase JS SDK           │ HTTPS (fetch/SSE)
                │ JSI bridge — OPTIONAL PATH)      │ (OPTIONAL PATH)           │ (OPTIONAL PATH)
┌───────────────▼──────────────────┐   ┌─────────▼─────────────┐   ┌────────▼─────────────────────┐
│ Android native (Kotlin) — ALWAYS  │   │ Firebase              │   │ Cloudflare Worker            │
│ RUNS, JS-independent, OS-managed: │   │ Auth │ Firestore │FCM │◀──│ (Hono + zod)                 │
│ AccessibilityService, WorkManager,│   │ Crashlytics           │   │ pairing (custom tokens),     │
│ Room (rules/usage/grants),        │   │                       │   │ FCM v1 sender, AI proxy,     │
│ LimitEngine, BlockActivity,       │   │                       │   │ quotas — signs its own JWTs  │
│ BroadcastReceivers                │   │                       │   │ (no firebase-admin on Workers)│
└───────────────────────────────────┘   └───────────────────────┘   └───────────────────────────────┘
      (iOS v2.0, same shape, Swift: FamilyControls + ManagedSettings + DeviceActivity extensions,
       each extension is its own OS-managed sandboxed process — same "native survives without host app" property)
```

The load-bearing property of this whole category of app (and the one thing every real implementation converges on) is the **vertical split down the middle**: everything left of "ScreenGuard (Expo Module)" is a *view* onto state; everything right of it is the actual product. If the JS layer disappears (crash, force-stop, device reboot before first open), the right-hand side must keep enforcing. ScreenLimiter's spec gets this right in §13.4 ("No JS dependency") — this is the correct standard pattern, not an over-engineering choice.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `GuardAccessibilityService` | Event-driven "what's in the foreground right now" signal, near-zero latency, no polling/battery cost | `AccessibilityService` bound by the system (`BIND_ACCESSIBILITY_SERVICE`), filters `TYPE_WINDOW_STATE_CHANGED`/`TYPE_WINDOWS_CHANGED` |
| `UsageTracker` | Ground-truth historical durations (what actually gets shown in Insights, compared against Digital Wellbeing) | `UsageStatsManager.queryEvents()` replay of `ACTIVITY_RESUMED/PAUSED`, `SCREEN_INTERACTIVE/NON_INTERACTIVE` — **not** the coarse `queryUsageStats()` buckets |
| `LimitEngine` | Pure evaluator, allow/block decision, no I/O | Plain-language rule engine, deterministic, unit-testable in isolation, mirrored 1:1 in the TS domain layer via shared JSON test vectors |
| `BlockLauncher`/`BlockActivity` | Cover the blocked app's screen | `startActivity()` with `FLAG_ACTIVITY_NEW_TASK` from the accessibility service context, **with a mandatory fallback path** (see Spec Validation below) |
| `RuleStore` (Room) | Single source of truth for enforcement, survives process death/reboot | SQLite via Room; read by the engine, written by sync + JS bridge |
| `SyncWorker` / `WatchdogWorker` | Periodic reconciliation independent of push delivery | `WorkManager` periodic work (15 min floor is an OS-enforced minimum, not a design choice) |
| `ScreenGuardModule` | Typed bridge from native state to the JS UI **only** | Expo Modules API native module, `sendEvent`-based event emitter |
| Cloudflare Worker | Thin, stateless relay: never a source of truth, never holds unaggregated usage | Hono router, signs its own service-account JWTs (no Node runtime, no firebase-admin) |
| Firestore | Cross-device sync log for parental mode | Client SDKs write directly; Worker only mediates pairing, push fan-out, and AI |

---

## Spec Validation — §12–16 (answers to the specific question asked)

### 1. AccessibilityService-based foreground detection vs. UsageEvents polling — **CORRECT, validated as the standard pattern**

The spec's hybrid (§13.3, §13.4) — accessibility events drive *live detection and blocking*, `UsageStatsManager.queryEvents()` drives the *historical ledger* — is what production apps converge on, and each half solves a problem the other can't:

- Pure `UsageStatsManager` polling has real, measured latency. One documented reimplementation (an app that switched away from AccessibilityService, see Sources) settled on **polling every ~800ms** and called that "imperceptible" — but that app only fires a *notification* at the limit, not a hard full-screen block. A ~1s worst-case detection gap is incompatible with ScreenLimiter's own budget ("block latency < 1.5s", §18) once you add the time to then launch/cover the screen. Accessibility events are push-based and sub-100ms.
- Polling-only also requires a continuous **foreground service** to keep the poll loop alive — which the spec explicitly avoids for battery reasons (§13.4: "no foreground service"). You cannot hit the < 2%/day battery budget with a persistent foreground service ticking every 800ms; you can with an event-driven accessibility callback that only ticks while a *limited* app is foregrounded (which is what §13.4 already specifies).
- `UsageStatsManager` alone also has known reporting gaps/bugs on some OEMs/versions (open Google issue trackers exist for "UsageStatsManager does not report foreground app after…" scenarios), which is exactly why using it as the *reconciliation* source (computed after the fact from a full event replay) rather than the *live trigger* is the safer allocation of responsibilities.

**Fix/refinement to note for the roadmap:** the spec's own risk table (§28, "Play rejects accessibility use") already has the right fallback — "UsageStats polling + notification-only enforcement (degraded)". Keep that as a documented degraded mode, not a silent architecture change, because it changes the product's core guarantee (hard block → soft nudge).

### 2. Launching a block Activity from a bound AccessibilityService on Android 10–16 (BAL exemptions) — **the spec's claim is NOT confirmed by official docs; treat as unvalidated until Phase 0 proves it, and harden the fallback**

This is the one substantive correction. §13.5 states the expectation is that this "is allowed via BAL exemption for bound accessibility services." I fetched Android's current official background-activity-start documentation directly: the documented allowlist is —

1. app has a visible window / foreground activity
2. app is the current IME
3. activity started from a system-sent `PendingIntent` (e.g., notification tap)
4. app holds `SYSTEM_ALERT_WINDOW`
5. app holds `START_ACTIVITIES_FROM_BACKGROUND`
6. app is bound by a service that itself was granted background-start permission (`BIND_ALLOW_ACTIVITY_STARTS`, and since Android 14 this must be explicitly passed by the binder — the system, in the accessibility case)
7. launch initiated by the launcher app
8. launch from a core OS component (e.g., telephony's incoming-call screen)

**"AccessibilityService" is not a named category on this list.** In practice, the reason this technique still works for many published app-blockers today is murkier than "documented exemption" — it rides on how the system dispatches accessibility callbacks, and it is not something Google has committed to keeping stable. This matters because:

- Android 14 tightened `BIND_ALLOW_ACTIVITY_STARTS` to require explicit opt-in from whoever bound the service.
- Android 15 added `setPendingIntentCreatorBackgroundActivityStartMode()` opt-in requirements and further BAL tightening.
- Android 16 added `StrictMode.detectBlockedBackgroundActivityLaunch()` — Google is actively building tooling to *detect and flag* blocked background launches, which signals continued tightening, not relaxation.
- `USE_FULL_SCREEN_INTENT` (the other common BAL-exempt path, via `Notification.setFullScreenIntent`) is auto-granted only up to Android 13; from Android 14 it's restricted to calling/alarm apps and requires manual user grant otherwise — so it is **not** a reliable cross-version substitute either without an extra permission-grant step in onboarding.

**Fix:** Treat §13.5's Phase 0 spike not as a validation step but as a **gating decision point** for the whole enforcement architecture, and make the existing fallback (`performGlobalAction(GLOBAL_ACTION_HOME)` + heads-up notification) a first-class, always-wired path rather than an emergency fallback — because `performGlobalAction` is a system action, not an activity start, so it has no BAL exposure at all and is instant. Recommended layered approach, in priority order per event:
1. Try `startActivity(BlockActivity)` from the accessibility service (works today on most OEMs/versions empirically).
2. If the activity does not reach the foreground within a short deadline (verify via the accessibility service's own next window-state event, or Android 16's `StrictMode` blocked-launch callback where available), immediately fall back to `GLOBAL_ACTION_HOME` and surface a heads-up notification offering to re-open the block screen (tapping a notification is an officially exempt `PendingIntent` path).
3. Re-validate this behavior on every Android beta/major release (already implied by the spec's "yearly re-validation" risk note — keep it, it is not optional given the Android 16 trendline above).
4. Do **not** default to `SYSTEM_ALERT_WINDOW` overlays to sidestep this — that's the most bulletproof technical fix (an overlay window isn't an activity start, so BAL doesn't apply at all) but directly conflicts with the spec's minimal-permissions/Play-review principle (§13.2 explicitly excludes it). Keep it as the last-resort spike output, not the default.

### 3. Enforcement fully native (Room + WorkManager), independent of the JS runtime — **CORRECT, this is the standard pattern for this domain**

This is exactly right and is what separates a real screen-time app from a toy. `AccessibilityService`, `WorkManager`, `BroadcastReceiver` and `Room` are all OS-managed or OS-scheduled components that Android will instantiate/run without any host Activity or JS runtime ever having started (post-boot, post-reboot). The only architectural risk here is discipline drift during implementation: it's easy to accidentally introduce a JS dependency (e.g., routing a rule-change through a JS-side handler "just this once" for convenience). Recommend a standing invariant test in CI/E2E: force-stop the RN process, change a rule via direct Room write (simulating sync), confirm the block/unblock still happens — this should be a permanent regression test, not a one-time Phase-0 spike result.

### 4. Expo Modules API bridging and events — **CORRECT, standard pattern, no changes needed**

The Expo Modules API's `sendEvent`/`addListener` event-emitter pattern (native → JS) and typed method bridge (JS → native) is the standard, stable way to do this in a prebuild/config-plugin Expo app, and it's the right layer for "UI reads/writes state" — but per point 3, it must remain optional and non-load-bearing for enforcement itself. One implementation note worth carrying into the phase plan: under the New Architecture (JSI), native→JS event emission still requires a live JS runtime to *receive* the event — which is fine, since events like `ruleBlocked`/`usageTick` are only needed while the UI is open; the actual block already happened natively before any event fires.

### 5. Shared `ScreenGuard` contract so iOS can implement the same interface later — **CORRECT, sound cross-platform architecture pattern**

This is a standard adapter/facade pattern (one typed interface, `capabilities()` feature-detection, opaque `AppRef` tokens) and it maps correctly onto the real constraints of Apple's Screen Time API: `FamilyActivityPicker` returns opaque tokens by design (Apple never exposes raw bundle IDs for privacy reasons), and each `DeviceActivityMonitor`/`ShieldConfiguration`/`DeviceActivityReport` extension runs in its own separate sandboxed OS process communicating only through an App Group container — so the "opaque platform-specific `AppRef.id`" and "no raw usage available outside the report extension" flags in §12.2/§14.2 are accurate reflections of real iOS constraints, not simplifications. One recommendation: freeze the `ScreenGuardApi` TS interface as versioned/append-only once the Android implementation ships (Phase 1) — changing it later to accommodate iOS quirks risks breaking the already-shipped Android contract. Build the interface to already accommodate known iOS gaps (`sessionLimits: false`, `openCountLimits: false`) from day one rather than retrofitting, which the spec already does.

### 6. Parent↔child sync via Firestore + FCM data messages sent from a Cloudflare Worker (FCM HTTP v1, service-account auth, on Workers) — **feasible, but requires custom crypto code the spec doesn't call out; add it explicitly**

Cloudflare Workers cannot run `firebase-admin` (it depends on Node's `crypto`/`fs`/etc., unavailable in the Workers runtime). The FCM HTTP v1 endpoint requires an OAuth2 Bearer token obtained by: (a) signing a JWT with the service account's RSA private key (RS256/RSASSA-PKCS1-v1_5), (b) exchanging that JWT at `https://oauth2.googleapis.com/token`. This is fully achievable on Workers using the **Web Crypto `SubtleCrypto` API** (import the PEM key as a `CryptoKey`, sign with it) — this is a well-established, cross-checked community pattern (multiple independent open-source implementations exist doing exactly this), not a novel or fragile approach. The `jose` library (works against WebCrypto, portable) is the common choice over hand-rolling JWT signing.

**Gap to close in the architecture, not a correction:** the spec's stack list mentions the Worker as "FCM sender" but doesn't call out that this requires writing and maintaining this JWT-signing code yourselves (no first-party SDK support). Recommend:
- Cache the resulting OAuth2 access token (valid ~1 hour) in Workers KV, keyed by service account, to avoid re-signing a JWT on every push — the spec already provisions KV for quotas/pairing, reuse it here.
- Confidence: MEDIUM-HIGH (cross-checked across multiple independent sources/implementations; not officially blessed by Firebase, but the underlying protocol is Google's public OAuth2 service-account flow, which is stable and documented independent of any SDK).

### 7. Pairing via Worker-minted Firebase custom tokens — **feasible via the same mechanism as #6; consolidate them**

Firebase custom tokens are, by Firebase's own public documentation, just a specifically-shaped JWT (header `{alg: RS256, typ: JWT}`, claims `iss`/`sub` = service account email, `aud` = the fixed Identity Toolkit audience string, `uid` = target Firebase UID, `iat`/`exp` ≤ 1 hour) signed with the same service-account private key used for #6. This means the Worker needs exactly **one** reusable "sign a JWT with the service-account key via WebCrypto" utility, used for two purposes: minting custom tokens for pairing, and obtaining OAuth2 access tokens for FCM sends. Building this as a single shared module (rather than two separate implementations) reduces the security-review surface and is the concrete recommendation to carry into the Worker's build order. Confidence: MEDIUM (community-verified pattern with existing open-source libraries doing this exact thing; still self-maintained crypto code, so it should get its own focused unit tests and a security review pass — treat it as a foundational, test-heavy Phase 5 deliverable, not a quick utility function).

### 8. Offline enforcement — **CORRECT, standard pattern**

Cache-then-enforce (Room as local source of truth, synced opportunistically, enforced regardless of connectivity) is exactly how this class of app must work, and matches how OS-level parental-control systems behave. No correction needed; the only sharpening worth calling out is in Data Flow below (the FCM push should be a "go fetch now" signal, never the payload itself).

---

## Recommended Project Structure

The spec's repository layout (§12.1) is already the right shape for this stack (Expo Modules API monorepo-in-one-repo: `app/`, `src/`, `modules/screen-guard/`, `backend/worker/`). No changes needed; two additions worth making explicit:

```
ScreenLimiter/
  modules/screen-guard/
    src/ScreenGuard.types.ts     # the FROZEN cross-platform contract (§12.2) — version this deliberately
    android/                     # Kotlin implementation
    ios/                         # Swift implementation (v2.0)
    shared-test-vectors/         # JSON fixtures run by BOTH Jest (TS) and JUnit (Kotlin) — build this
                                  # before either evaluator, not after (see Build Order)
  backend/worker/
    src/lib/google-auth.ts       # ONE shared WebCrypto JWT-signing utility, used by:
                                  #   - pairing (Firebase custom tokens)
                                  #   - FCM HTTP v1 sender (Google OAuth2 access tokens)
```

### Structure Rationale

- **`shared-test-vectors/` as its own directory, not buried inside `src/domain/`:** the spec already commits to "Kotlin LimitEngine matches TS reference exactly" (§20) — making the vectors a first-class, independently-versioned artifact (rather than test-only fixtures inside one language's test folder) makes it obvious that changing a rule's semantics requires updating one shared file that both platforms' CI must pass against.
- **`backend/worker/src/lib/google-auth.ts` as one module:** avoids the natural drift of building JWT-signing twice (once for pairing, once for FCM) with subtly different bugs. This is the single riskiest hand-written piece of the whole backend (self-implemented crypto against Google's OAuth2 service-account flow) and deserves to exist in exactly one place with focused tests.

---

## Architectural Patterns

### Pattern 1: Native-first, JS-optional enforcement (facade over a self-sufficient native core)

**What:** The JS/React Native layer is a *view and control surface* over native state, never a dependency of enforcement. All rule evaluation, blocking, and local persistence happen in OS-managed native components that the OS itself keeps alive independent of any Activity.
**When to use:** Any Android system where a promise must hold "even if the app was killed / never opened since reboot" — screen-time limiters, parental controls, ad-blockers, VPN-based filters all share this shape.
**Trade-offs:** More native code to write and test (Kotlin unit tests, Room migrations) instead of leaning on JS; in exchange you get a product that actually works when it matters (OEM kills the JS process, device reboots, network is down).

**Example (contract shape, not implementation):**
```typescript
// modules/screen-guard/src/ScreenGuard.types.ts
export interface ScreenGuardApi {
  setRules(rules: Rule[]): Promise<void>;   // writes to native Room; native engine picks it up
                                             // WITHOUT this call ever having to complete for
                                             // enforcement to keep working on already-stored rules
  addListener(event: 'ruleBlocked' | 'usageTick', cb: (e: unknown) => void): Subscription;
}
```

### Pattern 2: Push-as-signal, not push-as-payload

**What:** FCM data messages (and any "wake up" push) carry no business data — only a signal ("something changed, go fetch"). The receiving device always re-reads the authoritative source (Firestore, then writes to Room) rather than trusting the push payload.
**When to use:** Any sync path where delivery is best-effort (FCM has no delivery guarantee, especially on OEMs that kill background processes) and where staleness/ordering bugs from trusting payload contents would be worse than an extra round-trip.
**Trade-offs:** One extra network round-trip per sync vs. embedding data in the push; in exchange, sync self-heals from missed/out-of-order/duplicate pushes for free, and there's no FCM payload size ceiling (4KB) to worry about as the rule schema grows.
**Example:** the spec's own §7.3 flow ("Worker sends an FCM data message to the child → child native layer fetches rules") already follows this — validated, keep it, and make sure implementation never "optimizes" by putting the rule JSON directly in the FCM payload.

### Pattern 3: Thin, stateless serverless relay (never a system of record)

**What:** The Cloudflare Worker holds no durable business state of its own (KV/D1 used only for quotas, rate limits, and a cached OAuth2 token — all disposable/regenerable). Firestore remains the actual system of record for parental data; the Worker only signs tokens, proxies AI calls, and fans out pushes.
**When to use:** Whenever the primary cloud DB (Firestore here) already has client SDKs with security rules and offline persistence — the serverless function's job is to do the handful of things the client SDK legitimately cannot (mint tokens, call a provider API with a secret, apply server-side rate limits).
**Trade-offs:** Requires more care in Firestore security rules design (since clients write directly, not through a validating server) — the spec already accounts for this (§15.3, rules unit-tested with the Firebase emulator). Keep that discipline; do not let convenience later route Firestore writes through the Worker "to add validation," which would silently turn the Worker into a stateful bottleneck it isn't designed to be.

---

## Data Flow

### Flow A — Local enforcement loop (fully native, offline-capable)

```
Foreground app change
    ↓ (accessibility event, <100ms)
GuardAccessibilityService → LimitEngine.evaluate(currentApp, Room rules)
    ↓ BLOCK                                    ↓ ALLOW
BlockLauncher.startActivity(BlockActivity)     (no-op, app runs normally)
    ↓ (if not confirmed foregrounded quickly)
performGlobalAction(GLOBAL_ACTION_HOME) + heads-up notification (fallback)
```
This loop never touches JS, Firestore, or the network. It is the product's core guarantee and should be the first thing validated (Phase 0) and the last thing that's allowed to regress (permanent E2E test per point 3 above).

### Flow B — Rule authoring (self mode, on-device)

```
User edits a limit in RN UI
    ↓
Zustand store (optimistic UI update)
    ↓
ScreenGuard.setRules() [Expo Module bridge]
    ↓
Room write (native) — THIS is the moment the rule becomes real
    ↓
LimitEngine in-process refresh (re-evaluates current foreground app immediately)
    ↓
BlockActivity observes "still blocked?" → closes itself within 1s if now allowed
```
Direction is one-way and clear: JS is a client of native state, never the reverse. Zustand's copy is a *mirror*, hydrated from native — it must never be treated as authoritative (the spec already states this in §12.3's state table; worth re-stating because "just read from Zustand instead of round-tripping to native" is a common shortcut that quietly breaks the offline guarantee).

### Flow C — Parent↔child remote rule change

```
Parent app: Firestore write (families/{id}/devices/{id}/rules/{ruleId})   [client SDK, direct]
Parent app: also calls Worker POST /notify                                [explicit second call]
    ↓
Worker: signs OAuth2 token (WebCrypto+service account, cached in KV) → FCM HTTP v1 send
    ↓ (data message = "rules changed", NOT the rule payload)
Child device: FCM data message received → triggers immediate Firestore fetch
    ↓
Child native layer: writes fetched rules → Room → LimitEngine re-evaluates
```
Note the two-write nature of this flow (Firestore write + separate Worker call) — if the `/notify` call fails after the Firestore write succeeds, the child does not get the instant push, but correctness is preserved by the existing periodic fallbacks (app-open sync, 15-min WorkManager sync, reconnect sync) — this is graceful degradation, not a bug, but it's worth the parent-mode UI acknowledging "sent" vs. "applied" as distinct states rather than assuming push = instant.

### Flow D — AI (fully decoupled from enforcement)

```
RN app → Worker (install-token auth) → Groq (primary) / Gemini (fallback) → zod-validated JSON → RN renders
```
No path from this flow feeds back into Flow A or B — AI can be fully down and blocking/rules keep working, matching the spec's own stated principle. Validated as correctly isolated.

---

## Scaling Considerations

| Concern | At MVP / hundreds of users | At ~10K users | At ~250K+ active children |
|---------|--------------------------|----------------|---------------------------|
| Firestore writes (heartbeats + usage rollups) | Well inside Spark free tier (50K reads/20K writes/day) | Budget discipline (§15.1's ≤60 writes/child/day) starts to matter; monitor via Firebase console | Spark plan's 20K writes/day project-wide ceiling becomes binding — spec's own trigger ("migrate to Blaze at ~250 active children") is realistic and should be treated as a hard planning checkpoint, not a someday item |
| Cloudflare Worker requests (AI proxy, pairing, notify) | Well inside 100K requests/day free plan | Still comfortable; FCM sends dominate request count, not AI | May need Workers Paid ($5/mo, 10M req/mo) well before Firestore forces a Blaze upgrade — cheaper lever, pull it first |
| FCM OAuth2 token signing | Negligible cost, but re-signing per-request is wasteful | Cache in KV (~1hr TTL) becomes worth doing, not just nice-to-have | Token caching is required to avoid rate-limiting on Google's token endpoint |
| AI provider free-tier limits (Groq/Gemini) | Fine with per-user quotas already planned | Per-user quotas + small-model routing keep this bounded | Likely the first thing to force a monetization decision (§26), well before infra scaling is the bottleneck |

**First real bottleneck, in order:** (1) Firestore Spark write quota at scale, forcing a Blaze decision — but this is a *cost* decision, not an architecture one, since the Worker/Firestore split already isolates where the money would go. (2) AI provider free-tier exhaustion, which the spec already designs around (quotas, failover, graceful degradation). Neither requires re-architecting; both are "flip a billing switch" events given how the system is already split.

---

## Anti-Patterns

### Anti-Pattern 1: Trusting an unverified BAL exemption as a load-bearing assumption

**What people do:** Design the whole block-screen path around "accessibility services can start background activities" as a given, discover on a future Android release (the Android 16 `StrictMode.detectBlockedBackgroundActivityLaunch()` addition suggests this area keeps tightening) that it silently stops working on some OEM/version combination, and ship a regression with no fallback wired.
**Why it's wrong:** This is not a documented, stable platform guarantee (confirmed by reading Android's current official background-activity-start docs) — it is at best a currently-tolerated behavior.
**Do this instead:** Wire the `GLOBAL_ACTION_HOME` + notification fallback as a permanent, always-active safety net (not a Phase-0-only spike artifact), and add the fallback path to the yearly OS-compatibility re-validation the spec already calls out in §28.

### Anti-Pattern 2: Letting the Cloudflare Worker become a second source of truth

**What people do:** Once the Worker exists and can already "see" a request, it's tempting to add server-side validation/derived-state logic there over time ("just also update this counter in D1 while we're here"), until Firestore and the Worker's own storage can disagree about the real state.
**Why it's wrong:** Breaks the spec's own security model (§15.3 — Firestore rules are the enforcement boundary) and turns a stateless relay into a stateful bottleneck it wasn't designed or tested to be.
**Do this instead:** Keep the Worker's storage (KV/D1) strictly to ephemeral/regenerable data (rate-limit counters, cached OAuth2 tokens, pairing-code TTLs) — never business state that Firestore also claims to own.

### Anti-Pattern 3: Embedding payload in a push notification

**What people do:** Put the actual rule JSON (or usage data) inside the FCM data message to "save a round trip."
**Why it's wrong:** FCM has no delivery guarantee and a 4KB payload ceiling; a device that misses one push (common on Xiaomi/OEM-killed processes) then has no way to know it's out of sync, and larger rule sets simply won't fit as the product grows (schedules, multiple rule types, per-weekday overrides).
**Do this instead:** Push is a signal only ("go fetch"); the client always re-reads from Firestore. Already correctly implied by the spec's phrasing — just don't let it drift during implementation.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Firebase Auth/Firestore/FCM | Client SDK (app + parent), REST via signed JWT (Worker) | Worker cannot use `firebase-admin` (Node-only); must hand-roll the OAuth2/JWT flow with Web Crypto — validated feasible, budget real engineering time for it, not a "just import the SDK" task |
| Cloudflare Workers (Hono + zod) | Stateless HTTPS relay | KV for quotas/rate-limits/cached tokens; D1 optional; never a business system of record |
| Groq / Gemini (AI) | OpenAI-compatible chat-completions via Worker proxy | Fully decoupled from enforcement; provider-agnostic client already the right call |
| Google Play services (FCM transport, package broadcasts) | Standard Android APIs | Unavailable on Huawei/no-GMS devices — spec's polling fallback for those OEMs is correct and necessary |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| RN UI ↔ `ScreenGuard` native module | Expo Modules API (JSI methods + event emitter) | One-directional trust: native is authoritative, JS mirrors |
| `GuardAccessibilityService` ↔ `LimitEngine` | In-process function call | No IPC, no serialization — keep it that way for latency |
| `LimitEngine`/`RuleStore` ↔ `SyncWorker` | Room read/write | `SyncWorker` never bypasses Room to talk to the engine directly |
| Worker `google-auth.ts` ↔ Google OAuth2 / Identity Toolkit | Signed JWT → HTTPS token exchange | One shared utility for both FCM tokens and Firebase custom tokens (see Recommended Project Structure) |
| Android `ScreenGuard` impl ↔ iOS `ScreenGuard` impl (future) | Shared TS interface only, no runtime coupling | Freeze the interface once Android ships; iOS implements against it, doesn't renegotiate it |

---

## Suggested Build Order (component dependencies)

This is the dependency graph implied by the findings above, for the roadmap to sequence phases against:

1. **`ScreenGuard.types.ts` contract (frozen early) + `shared-test-vectors/`** — must exist *before* either the Kotlin `LimitEngine` or the TS domain evaluator is implemented, not after. Writing the contract and test vectors first is what makes "Kotlin matches TS exactly" (§20) achievable instead of aspirational; retrofitting vectors onto two already-diverged implementations is the expensive path.
2. **Phase 0 block-screen spike is a gate, not a checkbox** — because §13.5's core assumption is unconfirmed by official docs (see correction #2 above), the spike's outcome (does `startActivity`-from-accessibility-service reliably work on the target API range, and does the `GLOBAL_ACTION_HOME` fallback trigger cleanly) determines whether Phase 1's `BlockLauncher` needs the fallback wired as primary-with-retry or as true last-resort. Every downstream phase that assumes "blocking works" (1, 3, 4, 5, 7) inherits this decision — sequence it first and treat a "fallback-only" result as a valid, planned outcome, not a failure to re-spike.
3. **Android native core (Room schema, `LimitEngine`, `UsageTracker`, accessibility service) before any UI work depends on real data** — the spec's own Phase 1 ordering already does this; confirmed correct, no change.
4. **Worker's `google-auth.ts` (shared WebCrypto JWT signer) is a single prerequisite for two features** — build it once as its own tested unit before either pairing (custom tokens) or FCM sending is implemented, since both Phase 5 deliverables consume it. Building pairing first and FCM sending second (or vice versa) without factoring out this shared piece first risks two divergent, half-tested crypto implementations.
5. **Firestore security rules exist before any client is allowed to write directly** — since the Worker is deliberately not a validation gateway (Pattern 3), the rules *are* the enforcement boundary; they must be written and emulator-tested alongside the first Firestore schema, not bolted on after the parent/child UI is built.
6. **AI (Phase 6) has no upstream dependency on 1–5 beyond the Worker skeleton existing** — confirmed fully decoupled (Flow D); safe to build in parallel with parental/cloud work if team capacity allows, though the spec's sequential ordering (AI after parental) is also fine and lower-risk.
7. **iOS (Phase 8) depends on the `ScreenGuardApi` contract being stable, not on any other phase's code** — the Swift implementation is a fresh native implementation against an already-frozen interface; the only real dependency is discipline (don't let Android-specific needs leak into the shared contract after Phase 1).

## Sources

- [Restrictions on starting activities from the background — Android Developers](https://developer.android.com/guide/components/activities/background-starts) (HIGH — official docs, fetched directly; confirms no documented AccessibilityService BAL exemption)
- [Activity security | App architecture — Android Developers](https://developer.android.com/guide/components/activities/secure-bal) (HIGH — official)
- [Behavior changes: apps targeting Android 15 — Android Developers](https://developer.android.com/about/versions/15/behavior-changes-15) (HIGH — official, PendingIntent BAL opt-in changes)
- [UsageStatsManager | API reference — Android Developers](https://developer.android.com/reference/android/app/usage/UsageStatsManager) (HIGH — official)
- [Why I removed AccessibilityService from my Android app (and finally got into Play Store) — DEV Community](https://dev.to/lui61140/why-i-removed-accessibilityservice-from-my-android-app-and-finally-got-into-play-store-4i52) (MEDIUM — single real-world account, cross-checked against official latency/behavior expectations; used only to corroborate the trade-off, not as a primary source)
- Open-source Android app-blocker implementations surveyed for real-world block-screen technique diversity (accessibility-triggered `startActivity`, `GLOBAL_ACTION_HOME`, `SYSTEM_ALERT_WINDOW` overlays, foreground-service polling) — repos: TheHelixCore/AppBlocker, boudiahdab2003-art/AppBlocker, robinroy03/appblock, nish261/foqos-android (MEDIUM — community code, illustrative of the design space, not authoritative)
- [Firebase Authentication on Cloudflare Workers — Marco Cimolai, Medium](https://marplex.medium.com/firebase-authentication-on-cloudflare-workers-7c0af9df369b) (MEDIUM — cross-checked against a second independent implementation, see below)
- [Code-Hex/firebase-auth-cloudflare-workers — GitHub](https://github.com/Code-Hex/firebase-auth-cloudflare-workers) (MEDIUM — independent open-source implementation of the same WebCrypto JWT-signing pattern, corroborates feasibility)
- [Cloudflare Workers Pricing/Limits — developers.cloudflare.com](https://developers.cloudflare.com/workers/platform/pricing/) (HIGH — official, confirms 100K requests/day free tier still current as of 2026)
- [Firestore quotas and limits — Google Cloud docs](https://docs.cloud.google.com/firestore/quotas) (HIGH — official, confirms 50K reads/20K writes/day Spark quota still current as of 2026)
- Apple FamilyControls/ManagedSettings/DeviceActivity architecture (extension sandboxing, opaque tokens, App Group data sharing) — HIGH confidence from well-established, stable, extensively documented Apple framework behavior; not re-verified via live search this session as it has not materially changed and the spec's §14 mapping already reflects it accurately.

---
*Architecture research for: Android-first React Native screen-time limiter with native enforcement and parental sync*
*Researched: 2026-09-25*
