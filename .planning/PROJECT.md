# ScreenLimiter

## What This Is

A React Native (Expo) screen-time app that lets people put daily/usage limits on any installed app. When a limit is reached the app is blocked; when the limit is removed it works normally again immediately. It serves two audiences in one app: **self-control users** (students, professionals) and **parents** who remotely manage their children's phones. The experience is a premium, calm, animated "ocean wave" UI with light/dark themes, English + Urdu (any language addable), and a free-tier AI coach. Android ships first (v1.0); iOS follows (v2.0) without rewriting shared code.

Full product specification (source of truth for every detail): `docs/PRODUCT_SPEC.md`.

## Core Value

**Set a limit on an app and it is reliably blocked when time runs out — on any Android phone, even offline — and removing the limit restores the app instantly.** Everything else (AI, parental sync, gamification, design polish) is secondary to trustworthy enforcement.

## Business Context

- **Customer**: Adults who want to control their own phone use, and parents managing children's Android phones.
- **Revenue model**: Undecided (free / freemium / one-time unlock). No ads, ever. Architecture keeps an `entitlements` seam so gating can be added later.
- **Success metric**: Users with ≥1 active limit after 7 days ≥ 60%; ≥20% reduction in limited-app time after 4 weeks; Play rating ≥ 4.5.
- **Strategy notes**: `docs/PRODUCT_SPEC.md` §1 (vision), §25 (ASO), §26 (monetization).

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Enforcement core (Android native)**
- [ ] User can see all launchable apps with icons and categories (no `QUERY_ALL_PACKAGES`)
- [ ] App tracks per-app foreground time and opens accurately (±2 min vs Digital Wellbeing)
- [ ] User can set daily per-app, group/category, schedule/downtime, session, and open-count limits
- [ ] Each limit has an on/off toggle; add/edit/remove/toggle takes effect instantly (block screen closes ≤1 s after removal)
- [ ] Blocked app shows a native full-screen block screen within 1.5 s; works with JS runtime dead, offline, after reboot
- [ ] Friction unlock: small effort (breathing / typed phrase / wait) grants a few extra minutes (self mode)
- [ ] Focus mode: one-tap session allowing only allowlisted apps
- [ ] Permission onboarding with Play-compliant accessibility disclosure + consent, OEM-specific background guides, permission-health watchdog

**Experience**
- [ ] Premium animated wave UI ("Liquid Time" wave, wave ring, wave tab bar, duration dial, ocean world), 60 fps, haptics, Reduce Motion respected
- [ ] Light / Dark / System themes with animated ripple switch, token-based design system
- [ ] English + Urdu with full RTL; adding a language = one JSON file + one registry entry
- [ ] Insights: today/week/month, hourly heatmap, top apps, app detail
- [ ] Gamification: streaks, badges, growing ocean world
- [ ] Notifications (warnings at 80% / 5 min left, daily summary) and home-screen widgets

**Parental**
- [ ] Parent signs in, creates family, pairs a child phone via QR / 6-digit code
- [ ] Parent sees child usage and sets/edits/removes limits remotely; child applies within 10 s online, enforces cached rules offline
- [ ] Child can request more time; parent approves/denies from their phone
- [ ] Child settings locked by Parent PIN; parent gets tamper alerts (permission revoked, missing heartbeat, wrong PIN)
- [ ] Child device always shows a visible "managed by parent" notification (Play monitoring policy)

**AI (free tier)**
- [ ] Smart limit suggestions from usage history (one-tap apply)
- [ ] Intent check before opening distracting apps
- [ ] Coach chat in the user's language; weekly AI report (self and parent)
- [ ] Doom-scroll nudges (on-device heuristic)
- [ ] App fully usable when AI is unavailable; Groq key never hardcoded (Remote Config)

**Release**
- [ ] Passes Google Play review (accessibility declaration, Data Safety, privacy policy, account deletion, monitoring-app rules)
- [ ] Store listing optimized for ASO in EN + UR
- [ ] Works across Android 7 → latest and major OEMs (Xiaomi, Oppo/Realme/OnePlus, Vivo, Samsung, Huawei fallback)

### Out of Scope

- Strict Mode / locking limit edits / cooldowns on removal — user decided the app should control, not coerce; removal must be instant.
- Device Admin & uninstall prevention (self and child) — Play review risk; child mode uses PIN + tamper alerts instead.
- Location tracking, message/call reading, browsing history export, camera/mic, keystroke logging — privacy and Play stalkerware policy.
- Stealth/hidden mode on child devices — prohibited by Play monitoring-app policy.
- VPN-based blocking — unnecessary permission surface; accessibility + usage stats suffice.
- Ads — conflicts with wellbeing positioning and adds Data Safety burden.
- xAI Grok as AI provider — no free tier; Groq free tier used instead.
- Any separate backend (Cloudflare Worker / own server) and any paid service — user constraint: React Native + free Firebase + free Groq only.
- iOS in v1.0 — deferred to v2.0 (needs Mac/EAS + Apple Family Controls entitlement); architecture must stay iOS-ready.
- Website (URL) limits in v1.0 — deferred to v1.x; requires `canRetrieveWindowContent` and a stronger disclosure.

## Context

- **Greenfield**, empty repo except `docs/PRODUCT_SPEC.md` (848-line spec covering product, UX, architecture, data model, compliance, release, ASO, phases).
- **Technical environment (dev machine, Linux):** Node 24 via nvm (default), JDK 17 at `~/.local/jdk/jdk-17`, Android SDK at `~/Android/Sdk` (platforms 33–36, build-tools 36.1, NDK 29, emulator 36.1.9). No sudo available.
- **Test device:** Android emulator AVD `Medium_Phone_API_36.1` (Android 16 / API 36, KVM accelerated). No real phone in the loop; OEM behavior validated later via Firebase Test Lab + closed-testing testers.
- **Stack (planned):** Expo latest SDK with prebuild + Expo Modules API (Kotlin now, Swift later), TypeScript strict, Expo Router, Zustand, MMKV, Reanimated 3, React Native Skia, Moti, Lottie, victory-native, i18next; native Room + WorkManager; @react-native-firebase on the free Spark plan; no separate backend — Firebase free services only (Auth incl. Anonymous, Firestore, Remote Config, Crashlytics, Hosting for privacy/deletion pages); Groq free API called directly from the app via a provider-agnostic OpenAI-compatible client.
- **Key architecture idea:** one typed `ScreenGuard` native-module contract implemented per platform; `AppRef {platform,id}` abstraction (iOS uses opaque tokens); `capabilities()` flags hide unsupported features; enforcement lives entirely in native code.
- The user communicates in Roman Urdu/English; product copy launches in English + Urdu.

## Constraints

- **Compliance**: Google Play approval is the top priority — any feature risking review is dropped or redesigned; minimal permissions (no `QUERY_ALL_PACKAGES`, no Device Admin, no overlay unless proven necessary).
- **Compatibility**: Must work on any Android phone, Android 7 (API 24) → latest, including aggressive OEM battery managers.
- **Reliability**: Enforcement must be native, offline-capable, and independent of the JS runtime, network and AI.
- **Portability**: iOS must be addable later by implementing only the native layer; shared TS untouched.
- **Budget**: Completely free — no paid service of any kind (Firebase Spark only, Groq free tier). No Cloud Functions/Storage (Blaze-only).
- **Simplicity**: No separate backend — only React Native + free Firebase services + free Groq API key. Keep designs as simple as the goal allows.
- **Security**: No secrets hardcoded in the binary (Groq key via Remote Config, rotatable); Firestore security rules are the only server-side guard; `.env` never committed; only aggregated usage leaves the device.
- **Performance**: Cold start < 2 s, 60 fps animations, block latency < 1.5 s, battery < 2 %/day, background memory < 60 MB, crash-free ≥ 99.5 %.
- **Tooling**: No sudo on dev machine; all toolchains in user space.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Android first, iOS v2.0 with shared-TS / per-platform native contract | Android allows full control; iOS needs Mac + Apple entitlement | — Pending |
| No Strict Mode; limits removable instantly | User wants control without coercion | — Pending |
| Child protection = Parent PIN + tamper alerts, no Device Admin | Play review safety | — Pending |
| Enforcement via AccessibilityService + UsageStatsManager + native BlockActivity | Real-time foreground detection, works without JS | ✓ Phase 1 spike (API 36 emulator): primary = activity-first; fallback always wired — docs/decisions/0001-block-launch-path.md |
| Expo prebuild + Expo Modules API | Managed DX + custom native code + iOS extensions via config plugins | — Pending |
| Firebase-only, no separate backend (pairing via security rules, native Firestore listener instead of server push, local notifications for parent) | User: totally free + simple; no own backend | — Pending |
| Groq free API called directly from the app; key via Remote Config | User choice; accepted risk of key extraction and shared quota | — Pending |
| AI: Groq free tier only, provider-agnostic client | User choice; xAI Grok has no free tier | — Pending |
| i18n registry + JSON per language, RTL-first styling | New language without code changes | — Pending |
| Emulator AVD `Medium_Phone_API_36.1` as primary dev/test device | User's choice | — Pending |
| All UI in React Native, including the block ("Time's up") screen; Kotlin/Swift only for the background enforcement engine | User decision 2026-09-28; accepted trade-off: block UI may render ~1-2 s later when the JS runtime is cold, so native detection must still interrupt the blocked app immediately (native activity/Home fallback) and then show the RN UI | — Pending (implement in Phase 5/6) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-25 after initialization*
