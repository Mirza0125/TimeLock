# ScreenLimiter — Complete Product Specification

| | |
|---|---|
| Status | Approved for execution |
| Date | 2026-09-25 |
| Platforms | Android (v1.0), iOS (v2.0, architecture-ready from day one) |
| Working name | ScreenLimiter (store name TBD — candidates: TimeTide, ScreenTide, Limitly) |
| Purpose of this file | Single source of truth for product, UX, architecture, compliance and release. Input for `/gsd:new-project`. |

> **Revision 2026-09-25 (user constraint, overrides sections 7, 8.1, 12, 15, 21 and 24 where they conflict):**
> The app must use **only free services and no separate backend**: React Native + free Firebase (Spark) services + a free Groq API key.
> - **No Cloudflare Worker.** Pairing uses Firebase Anonymous Auth on the child plus a Firestore pairing-code document validated by security rules (single use, 10 min expiry).
> - **No server push.** The child applies remote rules through a native Firestore listener in the always-running enforcement process. The parent gets requests and alerts through Firestore listeners in the foreground, and through a WorkManager periodic check with local notifications in the background (≤ 15 min delay).
> - **AI:** the Groq free API is called directly from the app through a provider-agnostic client. The key comes from Firebase Remote Config, is never hardcoded, and can be rotated. Quotas are per install on the client. Gemini fallback is dropped for simplicity. Accepted risks: the key can be extracted, and the free quota is shared by all users.
> - **Client SDK:** `@react-native-firebase` (research: the JS SDK lacks offline persistence on RN, and Crashlytics).
> - Privacy policy and account-deletion pages are hosted on Firebase Hosting (free). Play target API 36 is already required.

---

## Table of contents
1. Vision & positioning
2. Users & personas
3. Product principles & hard decisions
4. Scope by release
5. Modes & onboarding flows
6. Feature specification (self mode)
7. Feature specification (parental mode)
8. AI features
9. Screen inventory & navigation
10. Design system, themes & motion
11. Internationalization (i18n)
12. System architecture
13. Android implementation
14. iOS implementation (v2.0)
15. Cloud backend (Firebase + Cloudflare Worker)
16. Data model
17. Security & privacy
18. Performance & battery budgets
19. Device compatibility
20. Testing & QA
21. Tooling, CI/CD & observability
22. Google Play compliance
23. Apple App Store compliance
24. Release process (Android & iOS)
25. ASO — store listing & growth
26. Monetization (open decision)
27. Roadmap & phases
28. Risks & mitigations
29. Open questions
30. Glossary

---

## 1. Vision & positioning

**Problem.** People lose hours to social media, short video and games without noticing. Built-in tools (Digital Wellbeing, Screen Time) are hidden, visually dull, easy to ignore, and give no guidance. Parents need a simple way to set their children's limits from their own phone.

**Vision.** A beautiful, calm, "ocean-like" app that makes limiting screen time feel pleasant, not punishing: set a limit in seconds, watch your time drain like water, get gentle AI coaching, and stay in control. You can always remove a limit, because the app helps you and doesn't lock you in.

**Positioning.** "Digital wellbeing that feels good": premium animated wave UI, AI coach in your own language (English/Urdu at launch), and self and family control in one app.

**Differentiators.**
1. Signature "Liquid Time" wave visualization and fully animated experience.
2. AI coach, smart limit suggestions and intent check. Free to run on free-tier LLM providers.
3. Self and parental modes in one app.
4. First-class Urdu + RTL; any language can be added with no code changes.
5. Non-coercive by design: no strict mode, no uninstall prevention.

**Success metrics (post-launch).**
- D7 retention ≥ 30%, D30 ≥ 15%.
- Users with ≥ 1 active limit after 7 days ≥ 60%.
- Average reduction of limited-app time after 4 weeks ≥ 20%.
- Play rating ≥ 4.5; crash-free users ≥ 99.5%; user-perceived ANR rate below Play "bad behavior" threshold.

---

## 2. Users & personas

| Persona | Description | Main jobs |
|---|---|---|
| **Sara, 24, student (Self)** | Loses 5h/day to Instagram/TikTok, wants to study | Set daily limits, block at night, see progress, gentle motivation |
| **Ahmed, 32, professional (Self)** | Wants focus during work hours | Work-hours schedule, focus mode, weekly insights |
| **Ayesha, 38, parent (Parent)** | Two kids, 9 and 14, with Android phones | Pair kids' phones, set limits remotely, bedtime, approve extra time |
| **Ali, 14, child (Child)** | Uses games and YouTube | Knows limits, can ask for more time, sees own progress |

---

## 3. Product principles & hard decisions

1. **User in control.** No Strict Mode, no Device Admin, no uninstall prevention, no cooldown on editing/removing limits in Self mode. Adding a limit applies instantly; removing it restores the app instantly (an active block screen closes).
2. **Child mode protection = Parent PIN + tamper alerts only.** Children cannot edit limits locally (PIN-locked). If protection is disabled or the app is uninstalled, the parent is alerted. No Device Admin.
3. **Play Store approval first.** Any feature that risks Play review is dropped or redesigned. Minimal permissions.
4. **Works on any Android phone.** OEM battery restrictions are handled explicitly.
5. **Enforcement is native and offline.** Blocking never depends on the JS runtime, network or AI.
6. **iOS-ready architecture.** iOS support = implement the native layer only; shared TypeScript is untouched.
7. **Privacy by default.** Usage data stays on device in Self mode. Only aggregated stats leave the device (AI, parental sync). No message, location, camera, microphone or screen-content access, ever.
8. **Delight.** Every interaction animated, 60 fps, haptics, light/dark themes, respects Reduce Motion.
9. **Any language, no code change.** New language = one JSON file + one registry entry.

---

## 4. Scope by release

### v1.0 — Android launch
- Self mode: all limit types, schedules, focus mode, block screen, friction unlock, insights, streaks, notifications, widgets.
- Parental mode: pairing, remote rules, dashboard, more-time requests, tamper alerts, multi-child.
- AI: smart suggestions, intent check, coach chat, weekly report, doom-scroll nudges.
- EN + UR, light/dark/system themes.

### v1.x — Android enhancements
- Website limits (browser URL detection via accessibility), predictive nudges, adaptive limits, accountability partner, more languages, home-screen widget variants, tablet layouts polish.

### v2.0 — iOS
- Parent mode on iPhone (UI + cloud only: can ship early, v1.x).
- Self mode + child mode on iOS via Screen Time API (FamilyControls, ManagedSettings, DeviceActivity).

### Out of scope (all versions)
Location tracking, message/call reading, browsing history export, camera/mic, keystroke logging, stealth/hidden mode, uninstall prevention, VPN-based blocking.

---

## 5. Modes & onboarding flows

### 5.1 First launch
1. **Splash:** animated wave logo (≤ 1.5 s, skipped if Reduce Motion).
2. **Language picker:** device locale preselected; EN/UR cards with native names.
3. **Welcome carousel (3 slides):** "See your time", "Set gentle limits", "Grow better habits". Swipeable, wave parallax.
4. **Mode selection:** "This phone is mine" (Self) / "I'm a parent" (Parent) / "This is my child's phone" (Child).
5. **Theme:** preview Light/Dark/System (skippable, default System).

### 5.2 Self mode onboarding
1. **Permission 1 — Usage Access.** Explainer screen with illustration → deep link to `Settings.ACTION_USAGE_ACCESS_SETTINGS` → auto-detect grant on return.
2. **Permission 2 — Accessibility.** *Prominent disclosure screen* (required by Play): what we access (which app is on screen), why (to block apps when a limit is reached), what we never access (screen content, typing, messages), and an explicit "I agree" button. Only then deep link to accessibility settings. Includes an OEM-specific tip and an Android 13+ "Allow restricted settings" guide when the app was sideloaded.
3. **Permission 3 — Notifications** (Android 13+ runtime permission).
4. **Permission 4 — Battery optimization exemption** (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` via system dialog; justified as a core function).
5. **OEM step (conditional):** Xiaomi/Oppo/Vivo/Realme/OnePlus/Samsung/Huawei-specific autostart/background guide with deep links + fallback screenshots.
6. **Baseline:** "We'll learn your habits." If usage history exists (UsageStats keeps days of history), show last 7 days immediately and offer AI smart suggestions.
7. **First limit:** guided creation of the first limit (suggested app preselected).

Permissions can be skipped; the app then runs in "limited" state with a persistent banner explaining what doesn't work.

### 5.3 Parent mode onboarding
1. Sign in (Google Sign-In or email/password via Firebase Auth).
2. Create family (name) → "Add child" → enter child's name + avatar → QR code + 6-digit code shown (valid 10 minutes).
3. Waiting screen with live status ("Waiting for Ali's phone…") → "Connected ✓".
4. Optional: parent can also use Self mode on the same device (toggle in settings).

### 5.4 Child mode onboarding (done together with the parent)
1. Scan QR or enter 6-digit code → device joins family (Firebase anonymous auth + pairing).
2. Parent creates a **Parent PIN** on the child device (4–6 digits; stored hashed, synced hash to parent).
3. Same permission flow as Self (5.2 steps 1–5), with child-friendly copy.
4. Persistent notification enabled: "This device is managed by <Family>". It cannot be dismissed while child mode is active (Play monitoring-app requirement).
5. Child home shows own limits and remaining time (read-only) + "Ask for more time".

### 5.5 Mode switching & unpairing
- Self ↔ Parent: available anytime in Settings.
- Child mode exit: requires Parent PIN **or** parent removes the device remotely. On exit, all rules are cleared and the app returns to mode selection.
- Uninstall is always possible (no Device Admin). If the child uninstalls, the parent is alerted (see 7.6).

---

## 6. Feature specification (self mode)

Conventions: each feature lists behavior, acceptance criteria (AC) and edge cases (EC).

### 6.1 App discovery
- Lists all launchable apps (MAIN/LAUNCHER intent query) with name, icon and system category (`ApplicationInfo.category`, API 26+), enriched by a bundled category map for popular apps.
- Excludes: this app, the default launcher, Phone/Dialer, emergency apps and Settings (Settings cannot be blocked, so the user can always fix permissions).
- Search, sort (usage today / name), filter by category.
- **AC:** app install/uninstall reflected within 5 s (package broadcast); icons cached.
- **EC:** work-profile apps are shown with a badge but not enforceable in v1. Disabled apps are hidden. Apps with multiple launcher activities are merged by package.

### 6.2 Usage tracking
- Source of truth: `UsageStatsManager.queryEvents` (ACTIVITY_RESUMED/PAUSED, SCREEN_INTERACTIVE/NON_INTERACTIVE, DEVICE_SHUTDOWN), computed into per-app foreground durations, not the coarse `queryUsageStats` buckets.
- Live usage: the accessibility service tracks the current foreground app and ticks a native timer (1 s resolution, persisted every 15 s and on app switch).
- Daily totals persisted to Room (`usage_daily`), retained 90 days locally.
- Opens counted when the app comes to the foreground after another app/home (not on rotation or in-app activity switches).
- **AC:** daily totals within ±2 min of Digital Wellbeing for a 4 h usage day.
- **EC:** screen off while app on top → time stops. Split-screen → both visible apps count. PiP → counts (video still consumes attention). Clock/timezone change → day boundaries recomputed in local time; rules re-evaluated immediately.

### 6.3 Limits
All limits: `enabled` toggle, name, targets, days of week (default all), created/updated timestamps.

| Type | Config | Behavior when exceeded |
|---|---|---|
| **Daily app limit** | app(s), duration (5 min–23 h 55 min, 5-min steps; per-weekday override optional) | Block for rest of day |
| **Group limit** | category or custom group, shared duration | All group apps blocked for rest of day |
| **Schedule / Downtime** | time window(s) (may cross midnight), days, block-all or selected apps, allowlist | Blocked inside window |
| **Session limit** | app(s), session length, break length | After session length continuous use → blocked for break length |
| **Open-count limit** | app(s), max opens/day | Opening beyond max → blocked for rest of day |

**Evaluation (LimitEngine), per foreground app, most restrictive wins:**
1. App in the global allowlist (Phone, Settings, this app, launcher, emergency) → never blocked.
2. Any active schedule covering the app (and app not in that schedule's allowlist) → BLOCK(reason=schedule, until=window end).
3. Any daily/group limit where `used ≥ limit` → BLOCK(reason=daily, until=midnight).
4. Open-count exceeded → BLOCK(reason=opens, until=midnight).
5. Session limit: continuous use ≥ session length → BLOCK(reason=session, until=now+break).
6. Active "extra time" grant covering the app suppresses reasons 3–5 until it expires (never overrides a schedule in child mode).
7. Else → ALLOW.

Re-evaluation triggers: foreground app change, 1 s tick while a limited app is in the foreground, any rule add/edit/remove/toggle, midnight, clock/timezone change, boot, extra-time grant/expiry.

**Instant removal AC:** removing/disabling the rule that blocks the current app closes the block screen within 1 s and the app is usable.

**Pre-limit warnings:** notification at 80% and 5 minutes left (configurable), plus a small in-app-style toast overlay via notification (heads-up). No overlay permission is needed.

### 6.4 Block experience
- Native full-screen `BlockActivity` launched over the blocked app (from the accessibility service; then `GLOBAL_ACTION_HOME` fallback if launch fails).
- UI: calm dark animated wave (native Canvas/Compose animation or Lottie), app icon, reason ("Daily limit of 1h reached" / "Downtime until 7:00"), remaining-until time, motivational line (localized, rotated; AI-personalized when available), actions:
  - **Close app** (go home)
  - **Take a breath** (30 s breathing animation)
  - **5 more minutes** (Self: friction unlock, 6.5) / **Ask parent for more time** (Child)
- Back button → home. Recents → blocked again on return.
- **AC:** blocked app never usable for > 1.5 s after a block condition starts (on reference devices).

### 6.5 Friction unlock (Self only)
- Optional per limit (default ON). Grants 5 min (configurable 1–15), max 3 grants per app per day (configurable).
- Friction options (user picks default): 30 s breathing exercise; typing "I choose to use <app> now"; wait-timer countdown (20 s).
- Grants are logged and shown in insights ("You took 3 extensions this week").

### 6.6 Focus mode
- One-tap session (25/50/90 min or custom): only allowlisted apps usable. Presets: "Study", "Work", "Sleep".
- Ends early anytime (Self). Live countdown notification with an "End" action.

### 6.7 Insights
- **Today:** total screen time wave, pickups (screen unlocks), top apps, per-app timeline.
- **Week/Month:** stacked bars by category, trend vs previous period, hourly heatmap (7×24), most improved app.
- **App detail:** usage history, opens, limits applied, extensions taken.
- Charts via victory-native (Skia), animated on mount, accessible labels.

### 6.8 Gamification
- **Streaks:** days where all limits were respected. Streak freeze earned every 7 days.
- **Ocean world:** a living ocean scene on Home that grows (fish, coral, light) with streaks. Pure delight, no pay-to-win.
- **Badges:** first limit, 7-day streak, 30-day streak, "night owl tamed", "-20% social time".
- Celebrations: confetti-bubbles animation + haptic, skipped when Reduce Motion is on.

### 6.9 Notifications
Channels (user-configurable): Limit warnings, Blocks, Daily summary (21:00 default), Weekly AI report, Parental (requests/alerts), Service status (low importance).

### 6.10 Widgets (Android home screen)
- Small: today's total with a mini wave. Medium: top 3 limited apps with remaining time. Updates every 15 min + on limit events. Built with `react-native-android-widget` or native Glance (decided in Phase 4 spike).

### 6.11 Settings
Mode, language, theme, notifications, default friction type, warning thresholds, day-start time (default 00:00), permissions health check, OEM guide, data export (JSON/CSV), delete all data, account (Parent/Child), privacy policy, licenses, version, "Send feedback".

### 6.12 Permissions health
A Home banner + Settings screen showing each required permission/service with a live status and "Fix" deep links. A WorkManager watchdog (every 15 min) checks the accessibility service is bound. If not, it shows a notification: "Protection paused — tap to fix".

---

## 7. Feature specification (parental mode)

### 7.1 Pairing
- Parent generates a pairing code (Worker creates `pairingCodes/{code}` with familyId, childProfileId, expiresAt = +10 min, single-use).
- Child scans the QR (`screenlimiter://pair?code=XXXXXX`) or types the code → Worker validates → adds the device to the family → returns a custom token so the child signs into Firebase as a device principal.
- **AC:** pairing completes < 10 s on a good network; expired/used codes are rejected with a clear message.

### 7.2 Parent dashboard
- Children list with avatar, today's screen time wave, protection status (green/amber/red), last sync time.
- Child detail: today/week usage, top apps with icons, active limits, pending requests, device info (model, Android version, app version, battery-optimization status).

### 7.3 Remote rules
- Parent creates/edits/removes any limit type (6.3) for a child device, including bedtime and school-time presets.
- Flow: parent app → Firestore write → Worker sends an FCM data message to the child → child native layer fetches rules → writes Room → LimitEngine re-evaluates.
- Child also syncs on app start, every 15 min (WorkManager) and on network regain.
- **AC:** online child applies a rule change < 10 s; offline child applies it on reconnect; enforcement continues offline using cached rules.

### 7.4 More-time requests
- Child taps "Ask for more time" (15/30/60 min + optional note) → parent gets a push → Approve (choose duration) / Deny → child notified; grant applied natively.
- Requests expire after 30 min unanswered. Max 5 pending/day per child.

### 7.5 Child experience
- Read-only view of own limits, remaining time, streaks and ocean world.
- Settings/limits/exit locked behind the Parent PIN (5 wrong attempts → 5 min lockout + parent alert).

### 7.6 Tamper alerts
Child device heartbeat every 15 min (WorkManager) + on state changes, containing: accessibility enabled, usage access granted, battery optimization exempt, notifications enabled, app version.
Alerts to parent:
- "Protection turned off on Ali's phone" (a permission revoked; sent immediately when detectable).
- "Ali's phone hasn't checked in for 6 hours" (heartbeat missing: could be off, offline, or uninstalled).
- "Wrong PIN attempts on Ali's phone".
Uninstall is detected by missing heartbeat only; we do not block it.

### 7.7 Family management
Multiple children, multiple parents (invite a co-parent by link), rename/remove child, remove device (remote unpair wipes rules on the child on next sync), delete family.

---

## 8. AI features

### 8.1 Provider strategy
- Provider-agnostic client in the Worker using the OpenAI-compatible chat-completions format.
- **Primary: Groq free tier** (~30 req/min; ~1,000 req/day on large models, ~14,400/day on small fast models; limits are per account, shared by all users. Verify current limits at implementation time).
- **Fallback: Google Gemini free tier.** Automatic failover on 429/5xx.
- Not xAI Grok (no free tier; paid after sign-up credits).
- Model roles: `large` (coach, weekly report, suggestions) and `small` (intent check, classification). Concrete model IDs live in Worker config, not in the app.
- Per-user quota in the Worker (e.g., 20 coach messages/day, 3 suggestion runs/day, unlimited intent checks up to a global cap). The app shows remaining quota.
- The app must be fully functional when AI is unavailable (offline, quota, provider outage); AI entry points show "Try again later".

### 8.2 Privacy contract for AI
Sent: app display names, categories, minutes per app/day, hourly buckets, limits, streak counts, user's chosen language, the user's chat text.
Never sent: package-level history beyond 28 days, device IDs, account email, contacts, location, screen content. Requests carry a random per-install pseudonymous ID for quota only. The Worker doesn't log prompt bodies.

### 8.3 Features
| Feature | Trigger | Input | Output (structured) |
|---|---|---|---|
| **Smart limit suggestions** | Onboarding, weekly, on demand | 7–28 days usage aggregates | JSON: `[{app, currentAvgMin, suggestedMin, rampPlan:[{week, min}], reason}]` → one-tap apply |
| **Intent check** | Opening an app tagged "distracting" (opt-in per app) | App name, time of day, today's usage, user's typed/selected reason | JSON: `{decision: allow|timer|suggest_break, minutes?, message}`. Chips ("Reply to message", "Bored", "Work") work offline with rules; AI only personalizes the message |
| **Doom-scroll nudge** | On-device heuristic: continuous session > X min, or > N switches between distracting apps in 10 min, or late-night use | — (on device) | Local notification; AI-phrased message cached from the weekly batch |
| **Coach chat** | User opens Coach tab | Aggregated usage summary + conversation (last 10 turns) | Streamed text in selected language; can propose actions rendered as buttons ("Set Instagram to 1h") |
| **Weekly report** | Sunday 20:00 local (WorkManager) | Week vs previous week aggregates | JSON: `{headline, wins[], watchouts[], suggestion}` rendered as animated story cards |
| **Parent weekly report** | Weekly per child | Child aggregates | Same schema, parent-oriented tone |
| **Predictive nudges (v1.x)** | Pattern detected (same late-night pattern 3+ days) | Hourly heatmap | Suggestion to schedule focus/downtime |

### 8.4 Prompting rules
- System prompt: supportive, non-judgmental, concise, never medical/diagnostic claims, never shaming, respond in `{language}`, refuse unrelated tasks politely ("I'm your screen-time coach").
- Child-facing output uses age-appropriate, encouraging tone. The coach is not available to child mode in v1 (parents get reports instead).
- All structured outputs validated with a schema (zod) in the Worker; invalid → one retry → fallback template.
- In-app "Report response" on every AI message (Play AI-generated content policy) → stored for review.

---

## 9. Screen inventory & navigation

Expo Router with a route group per mode.

```
app/
  _layout.tsx                      Theme + i18n + providers
  index.tsx                        Redirect by mode/onboarding state
  (onboarding)/
    language.tsx  welcome.tsx  mode.tsx  theme.tsx
    permissions/[step].tsx  oem-guide.tsx  first-limit.tsx
  (self)/(tabs)/
    home.tsx        Liquid time wave, top apps, streak, ocean
    apps.tsx        App list + search + filters
    insights.tsx    Today / Week / Month
    coach.tsx       AI chat
    settings.tsx
  (self)/limit/new.tsx  limit/[id].tsx  app/[appId].tsx
  (self)/schedule/[id].tsx  focus.tsx  report/[week].tsx
  (parent)/(tabs)/
    family.tsx  requests.tsx  reports.tsx  settings.tsx
  (parent)/child/[childId]/index.tsx  apps.tsx  limit/[id].tsx
  (parent)/add-child.tsx  auth.tsx
  (child)/home.tsx  request-time.tsx  pin.tsx  pair.tsx
  permissions-health.tsx  about.tsx
```
Native (not RN): `BlockActivity`, the persistent child notification and widgets.

---

## 10. Design system, themes & motion

### 10.1 Tokens (three layers)
- **Primitive:** color scales (ocean 50–950, aqua, coral, amber, mint, neutral), spacing 4-pt scale (4…64), radii (8, 12, 16, 24, 32, full), durations (120, 200, 320, 500, 800 ms), easings/springs.
- **Semantic:** `bg`, `bgElevated`, `surfaceGlass`, `textPrimary`, `textSecondary`, `accent`, `success`, `warning`, `danger`, `waveA/B/C`, `border`, `overlay`.
- **Component:** `card.bg`, `button.primary.bg`, `waveRing.track`, `chart.series[n]`, etc.

### 10.2 Themes
| | Light | Dark |
|---|---|---|
| Background | soft pearl `#F6FAFD` → aqua gradient | deep ocean `#060B1A` → navy gradient |
| Waves | pastel aqua/teal/lavender, 60–80% opacity | teal/cyan/violet with glow |
| Cards | frosted white glass (blur 20) | frosted navy glass, 1 px light border |
| Accent | `#0EA5E9` family | `#22D3EE` family |
Exact values finalized in Phase 2 with contrast validation (WCAG AA 4.5:1 text, 3:1 UI).

Modes: Light / Dark / System (default). Switch animation: Skia circular "ripple" reveal from the toggle position (~500 ms). Theme persisted in MMKV.

### 10.3 Typography
- Latin: a humanist sans (e.g., "Plus Jakarta Sans" or "Inter") via expo-font.
- Urdu: "Noto Nastaliq Urdu" (line-height ≥ 1.8×).
- Scale: 12/14/16/20/24/32/44, respects system font scale up to 200% without clipping.

### 10.4 Signature components (Skia + Reanimated)
- `LiquidWave`: sine-wave fill with 2–3 phase-shifted layers, level = remaining fraction, color interpolates mint → amber → coral, gentle idle motion, tilts slightly with device gyroscope (optional, off with Reduce Motion).
- `WaveRing`: circular progress with a wavy stroke.
- `WaveBackground`: slow ambient gradient waves per screen.
- `WaveTabBar`: tab indicator is a wave bump that springs between tabs.
- `DurationDial`: circular dial for picking a duration with haptic ticks every 5 min.
- `OceanWorld`: Home scene that grows with streaks (Lottie + Skia).

### 10.5 Motion principles
- Springs over linear; list items stagger 30 ms; shared-element transitions app list → app detail.
- All animations on the UI thread (Reanimated worklets); no JS-thread animation.
- Reduce Motion: replace motion with fades, stop idle waves.
- Haptics: selection ticks (dial), success (limit saved), warning (limit reached).

### 10.6 Accessibility
TalkBack labels on all controls, 48 dp touch targets, color never the only signal (icons + text), dynamic type, RTL mirroring, focus order checked.

---

## 11. Internationalization (i18n)

- Libraries: `i18next`, `react-i18next`, `expo-localization`, ICU plural support (`i18next-icu` or built-in plurals).
- Files: `src/locales/<code>.json` (namespaced keys: `onboarding.*`, `limits.*`, `block.*`, `ai.*`…).
- Registry `src/i18n/languages.ts`:
  ```ts
  export const LANGUAGES = [
    { code: 'en', nativeName: 'English', rtl: false, font: 'PlusJakartaSans' },
    { code: 'ur', nativeName: 'اردو', rtl: true, font: 'NotoNastaliqUrdu' },
  ] as const;
  ```
- **Adding a language:** add `src/locales/xx.json` + one registry line (+ font file if new script). A CI check fails on missing keys vs `en.json`.
- RTL: `I18nManager.allowRTL(true)`; switching direction requires an app reload (`expo-updates`/`DevSettings.reload`), and the user is told. All styles use `start/end`, `marginStart/End`, `paddingStart/End`; icons with direction are mirrored; wave direction flips.
- Native strings (block screen, notifications, widgets): the JS layer pushes the localized string bundle for native-used keys into native storage on language change, so there is a single source of truth. Android `strings.xml` holds only fallbacks.
- Dates, times, numbers and durations via `Intl` (`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`), with Hermes Intl enabled.
- AI responds in the selected language (passed in every request).
- Store listing localized per language (section 25).

---

## 12. System architecture

```
┌──────────────────────────── React Native app (TypeScript) ────────────────────────────┐
│ UI (Expo Router, Skia, Reanimated) │ i18n │ Theme │ Zustand stores │ MMKV              │
│ Domain: rules model, validation (zod), scheduling helpers (pure TS, unit-tested)       │
│ Services: ScreenGuard client │ Sync (Firestore) │ AI client (Worker) │ Notifications   │
└───────────────┬──────────────────────────────┬──────────────────────────┬─────────────┘
                │ ScreenGuard (Expo Module)     │ Firebase SDK             │ HTTPS
┌───────────────▼──────────────┐   ┌───────────▼──────────┐   ┌──────────▼─────────────┐
│ Android native (Kotlin)      │   │ Firebase             │   │ Cloudflare Worker      │
│ Accessibility, LimitEngine,  │   │ Auth, Firestore, FCM │◀──│ pairing, FCM sender,   │
│ UsageTracker, Room, Block UI │   │ Crashlytics          │   │ AI proxy, quotas       │
└──────────────────────────────┘   └──────────────────────┘   └────────────────────────┘
      (iOS Swift in v2.0: FamilyControls, ManagedSettings, DeviceActivity extensions)
```

### 12.1 Repository structure
```
ScreenLimiter/
  app/                         Expo Router routes (section 9)
  src/
    components/{waves,ui,charts}/
    features/{limits,insights,coach,parental,onboarding,focus}/
    domain/                    rules.ts, evaluate.spec.ts (reference evaluator for tests), time.ts
    services/{screenGuard,sync,ai,notifications}/
    store/                     zustand slices
    theme/                     tokens.ts, light.ts, dark.ts, ThemeProvider.tsx
    i18n/                      index.ts, languages.ts
    locales/                   en.json, ur.json
  modules/screen-guard/
    index.ts                   typed JS API
    src/ScreenGuard.types.ts   shared contract
    android/                   Kotlin
    ios/                       Swift (v2.0)
  plugins/                     Expo config plugins (manifest entries, iOS targets)
  backend/worker/              Cloudflare Worker (TypeScript, Hono)
  firebase/                    firestore.rules, firestore.indexes.json
  e2e/                         Maestro flows
  store-listing/               ASO copy per language, screenshots sources
  docs/
```

### 12.2 ScreenGuard contract (shared by Android and iOS)
```ts
export type Platform = 'android' | 'ios';
export interface AppRef { platform: Platform; id: string }   // Android: package name; iOS: base64 token
export interface InstalledApp { ref: AppRef; name: string; category: AppCategory; iconUri?: string }
export interface Capabilities {
  listApps: boolean; rawUsage: boolean; sessionLimits: boolean;
  openCountLimits: boolean; websiteLimits: boolean; customBlockScreen: boolean;
}
export interface PermissionState {
  usageAccess: Status; accessibility: Status; notifications: Status;
  batteryOptimizationExempt: Status; screenTimeAuthorization?: Status; // iOS
}
export interface ScreenGuardApi {
  capabilities(): Capabilities;
  getPermissionState(): Promise<PermissionState>;
  requestPermission(p: keyof PermissionState): Promise<void>;
  getInstalledApps(): Promise<InstalledApp[]>;
  pickApps?(): Promise<AppRef[]>;                                   // iOS FamilyActivityPicker
  getUsage(range: DateRange): Promise<UsageDay[]>;
  getLiveStatus(): Promise<LiveStatus>;                              // current app, remaining per rule
  setRules(rules: Rule[]): Promise<void>;                            // full replace, idempotent
  grantExtraTime(ref: AppRef, minutes: number, source: 'friction'|'parent'): Promise<void>;
  setMode(mode: 'self'|'parent'|'child'): Promise<void>;
  setNativeStrings(bundle: Record<string,string>): Promise<void>;
  addListener(event: 'ruleBlocked'|'usageTick'|'permissionChanged'|'appsChanged', cb): Subscription;
}
```
UI checks `capabilities()` and hides unsupported features, so nothing is platform-branched in screens.

### 12.3 State & storage
| Data | Where | Why |
|---|---|---|
| UI prefs (theme, language, mode, onboarding) | MMKV | fast sync reads |
| Rules (source of truth for enforcement) | Native Room (Android) / App Group store (iOS) | enforcement without JS |
| Rules mirror for UI | Zustand, hydrated from native | reactive UI |
| Usage history | Native Room, read via `getUsage` | written by native service |
| Parental/cloud state | Firestore (+ offline persistence) | sync |
| Secrets | none in app; Worker env vars | security |

---

## 13. Android implementation

### 13.1 Build config
- Expo (latest SDK) with prebuild; New Architecture enabled; Hermes.
- `minSdkVersion` 24 (Android 7.0); `targetSdkVersion` = Play's current requirement at release (API 35 required since Aug 2025; plan for API 36); `compileSdk` latest.
- Kotlin, Coroutines, Room, WorkManager, Jetpack Compose only for native block UI and widgets (optional).

### 13.2 Manifest (via config plugin)
- Permissions: `PACKAGE_USAGE_STATS` (tools:ignore protected), `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` **only if** the Phase 1 spike proves inexact alarms insufficient for schedule boundaries (prefer inexact + accessibility-driven evaluation).
- **Not requested:** `QUERY_ALL_PACKAGES`, `SYSTEM_ALERT_WINDOW` (unless the spike proves a need), `BIND_DEVICE_ADMIN`, location, contacts, storage, camera, mic.
- `<queries>`: intent MAIN + LAUNCHER.
- Accessibility service: `android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"`; config `accessibilityEventTypes="typeWindowStateChanged|typeWindowsChanged"`, `canRetrieveWindowContent="false"` in v1 (true only in v1.x for website limits, with updated disclosure), `isAccessibilityTool="false"`, description string = plain-language disclosure.
- Parental monitoring metadata flag (IsMonitoringTool = parental_control), exact syntax per current Play docs, in child-capable builds.

### 13.3 Components
| Component | Responsibility |
|---|---|
| `GuardAccessibilityService` | Receives window-state events → resolves foreground package (ignores own overlay, IME, system UI) → notifies `LimitEngine` |
| `LimitEngine` | Pure-Kotlin evaluator (mirrors `src/domain` rules; shared test vectors in JSON) + tick scheduler while a limited app is foreground |
| `UsageTracker` | Event-based usage computation; daily rollups; opens counting |
| `BlockLauncher` / `BlockActivity` | Starts block UI (`FLAG_ACTIVITY_NEW_TASK`), `excludeFromRecents`, handles actions |
| `RuleStore` (Room) | rules, grants, usage_daily, usage_sessions, events_log, native_strings |
| `SyncWorker` | Child mode: pull rules, push usage/heartbeat (WorkManager, 15 min, network constraint) |
| `WatchdogWorker` | Checks service enabled/bound; posts "Protection paused" notification |
| `BootReceiver` / `TimeChangeReceiver` / `PackageReceiver` | Reschedule, recompute, refresh app list |
| `FcmService` | Child: data messages → trigger immediate sync |
| `OemHelper` | Detect manufacturer/ROM; deep-link intents for autostart/battery screens with fallbacks |
| `ScreenGuardModule` | Expo module bridge; events to JS |

### 13.4 Key behaviors
- **No JS dependency:** the service, engine and block UI work if the RN app was never opened after boot.
- **Instant re-evaluation** on `setRules` (a Room write triggers an in-process engine refresh; the block activity observes a "still blocked?" flow and finishes itself when allowed).
- **Clock tampering:** use `SystemClock.elapsedRealtime` for session timers; detect wall-clock jumps (`ACTION_TIME_CHANGED`) and recompute; in child mode, report tamper events.
- **Battery:** no foreground service; 1 s ticking only while a limited app is foreground; no polling otherwise.

### 13.5 Background-launch validation (Phase 0 spike)
Validate on Android 10, 12, 14 and latest that the bound accessibility service can start `BlockActivity` from the background (expected: allowed via BAL exemption for bound accessibility services). Fallback: `performGlobalAction(GLOBAL_ACTION_HOME)` + heads-up notification.

---

## 14. iOS implementation (v2.0)

### 14.1 Frameworks
- **FamilyControls:** authorization (`.individual` for Self, `.child` for Child via Family Sharing); `FamilyActivityPicker` to select apps/categories/websites (returns opaque tokens).
- **ManagedSettings:** `ManagedSettingsStore.shield.applications/categories` to block.
- **DeviceActivity:** `DeviceActivityMonitor` extension with schedules and threshold events → apply/remove shields.
- **ShieldConfiguration** extension: custom block screen (wave-styled, limited UI). **ShieldAction** extension: handle buttons.
- **DeviceActivityReport** extension: usage charts (data sandboxed, cannot leave the extension).

### 14.2 Mapping from the rules model
| Rule | iOS mechanism | Capability |
|---|---|---|
| Daily app/group limit | DeviceActivitySchedule (daily, repeats) + DeviceActivityEvent threshold → shield | ✅ |
| Schedule/downtime | DeviceActivitySchedule intervalStart/End → shield/unshield | ✅ |
| Session limit | — | ❌ `sessionLimits=false` |
| Open count | — | ❌ `openCountLimits=false` |
| Instant removal | clear store shields + stop monitoring | ✅ |
| Extra time | temporary unshield + one-off schedule | ✅ |
| AI usage insights | no raw usage available outside the report extension | ⚠️ `rawUsage=false`: AI uses only limit events + user input |

### 14.3 Engineering notes
- Extensions added via an Expo config plugin (e.g., `@bacons/apple-targets`), sharing data through an App Group; the Swift side implements the same `ScreenGuardApi`.
- Entitlement `com.apple.developer.family-controls` for the app **and every extension**; the distribution entitlement must be requested from Apple (lead time: weeks) before TestFlight.
- Builds require macOS + Xcode or EAS Build (cloud). Testing requires a real device (Screen Time APIs don't work in the simulator).
- Parent mode on iOS = UI + Firebase only, so it can ship before v2.0. Limitation: iOS child app tokens are not meaningful on the parent device; for iOS children, the parent picks apps via a flow run on the child device, or by category.

---

## 15. Cloud backend

### 15.1 Firebase (Spark free plan at launch)
- **Auth:** Google, email/password (parents); custom tokens for paired child devices (minted by the Worker).
- **Firestore:** offline persistence on; schema in section 16.
- **FCM:** push to devices. Sent by the Worker via FCM HTTP v1 (Cloud Functions need the paid Blaze plan, so we avoid them).
- **Crashlytics:** crash reporting (all modes).
- Free quota awareness: Firestore free tier ≈ 50K reads / 20K writes / day per project. Budget per child/day ≤ 60 writes (hourly usage rollups + heartbeats + events). Plan migration to Blaze when > ~250 active children.
- No Firebase Storage (needs Blaze for new buckets): app icons for the parent view are 48×48 WebP, base64 in the app document (≤ 4 KB).

### 15.2 Cloudflare Worker (free plan: 100K requests/day)
Stack: TypeScript + Hono + zod. Secrets: `GROQ_API_KEY`, `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT` (Worker secrets). KV/D1 for quotas and pairing rate limits.

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /pair/create` | Parent Firebase ID token | Create pairing code |
| `POST /pair/redeem` | none (rate-limited by IP + code) | Validate code → custom token for child |
| `POST /notify` | Firebase ID token | Send FCM to family devices (rule changed, request, alert) |
| `POST /ai/suggest` `/ai/intent` `/ai/report` | Install token (signed) | AI features |
| `POST /ai/chat` | Install token | Streaming coach chat (SSE) |
| `POST /ai/report-response` | Install token | User reports an AI message |
| `GET /health` | none | Uptime |

Install token: on first launch the app gets a signed JWT from the Worker bound to a random install ID (+ Play Integrity verdict in v1.x to prevent abuse).

### 15.3 Firestore security rules (principles)
- Parents read/write only families where `members/{uid}.role == 'parent'`.
- Child device principals read only their own device's `rules`/`grants` and write only their own `usage`, `heartbeat`, `requests`, `apps`.
- Pairing codes are never client-readable (Worker only).
- Rules unit-tested with the Firebase emulator.

---

## 16. Data model

### 16.1 Shared TypeScript domain (mirrored in Kotlin/Room)
```ts
type RuleType = 'daily' | 'group' | 'schedule' | 'session' | 'openCount';
interface RuleBase { id: string; type: RuleType; name: string; enabled: boolean;
  days: Weekday[]; createdAt: number; updatedAt: number; source: 'self'|'parent' }
interface DailyRule    extends RuleBase { type:'daily';    targets: AppRef[]; minutes: number; perDay?: Partial<Record<Weekday, number>>; friction: FrictionCfg }
interface GroupRule    extends RuleBase { type:'group';    category?: AppCategory; targets: AppRef[]; minutes: number; friction: FrictionCfg }
interface ScheduleRule extends RuleBase { type:'schedule'; windows: {start:'HH:mm'; end:'HH:mm'}[]; blockAll: boolean; targets: AppRef[]; allowlist: AppRef[] }
interface SessionRule  extends RuleBase { type:'session';  targets: AppRef[]; sessionMin: number; breakMin: number }
interface OpenCountRule extends RuleBase { type:'openCount'; targets: AppRef[]; maxOpens: number }
interface Grant { id: string; target: AppRef; until: number; source: 'friction'|'parent' }
interface UsageDay { date: 'YYYY-MM-DD'; apps: { ref: AppRef; minutes: number; opens: number; hourly: number[] }[]; pickups: number }
```

### 16.2 Room tables (Android)
`rules(id PK, type, json, enabled, updatedAt)`, `grants`, `usage_daily(date, pkg, minutes, opens, hourlyBlob)`, `usage_sessions(pkg, start, end)`, `block_events(ts, pkg, reason)`, `native_strings(key, value)`, `kv(key, value)`.

### 16.3 Firestore
```
families/{familyId}                      name, createdAt, ownerUid
  members/{uid}                          role:'parent', displayName, fcmTokens[]
  children/{childId}                     name, avatar, pinHash, createdAt
  devices/{deviceId}                     childId, platform, model, osVersion, appVersion,
                                         locale, tz, fcmToken, lastHeartbeat, protection{...}
    apps/{appId}                         name, category, icon(b64), installed
    rules/{ruleId}                       Rule JSON (16.1), updatedAt, updatedBy
    grants/{grantId}
    usage/{YYYY-MM-DD}                   per-app minutes/opens (hourly rollup)
    requests/{reqId}                     appId, minutes, note, status, createdAt, decidedBy
    alerts/{alertId}                     type, createdAt, seen
pairingCodes/{code}                      (Worker-only) familyId, childId, expiresAt, used
```

---

## 17. Security & privacy

- **Data minimization:** Self mode works fully offline and without an account; no usage leaves the device except AI requests the user triggers (aggregates only).
- **Encryption:** TLS for all traffic; Firestore/Worker at rest per provider; Room DB not exported (`allowBackup` limited to prefs via backup rules; no usage history in cloud backups).
- **Secrets:** none in the app binary; API keys only in Worker secrets; `.env` never committed.
- **Child safety:** no content access, visible management notification, PIN hashed (PBKDF2/Argon2 with salt), brute-force lockout.
- **Account deletion:** in-app (Settings → Delete account) + public web page (Play requirement); deletes family/device data from Firestore within 30 days (immediately for the family doc tree).
- **Data retention:** local usage 90 days; cloud usage 60 days (scheduled cleanup via Worker cron).
- **Threat model (child bypass):** revoking accessibility → alert; uninstall → missing heartbeat alert; time change → recompute + alert; safe-mode boot → no enforcement (accepted; heartbeat shows). Second user profile / work profile → not enforced in v1 (documented limitation). Split-screen/PiP → handled.
- **Abuse of AI endpoint:** install JWT + per-install quotas + global caps + (v1.x) Play Integrity.

---

## 18. Performance & battery budgets

| Metric | Budget |
|---|---|
| Cold start to interactive (mid-range device) | < 2.0 s |
| Animations | 60 fps (UI thread); no dropped frames on Home on a mid-range device |
| Block latency after limit reached | < 1.5 s |
| Battery drain attributable to app | < 2% per day for typical use |
| APK download size (per-ABI via AAB) | < 30 MB |
| Memory (background service) | < 60 MB |
| Crash-free users | ≥ 99.5% |

---

## 19. Device compatibility

### 19.1 Android versions
Supported Android 7.0 (API 24) → latest. Version-specific handling:
- 8+: notification channels; `ApplicationInfo.category`.
- 10+: background activity start restrictions (accessibility exemption).
- 11+: package visibility (`<queries>`).
- 12+: exact alarm restrictions; splash screen API.
- 13+: `POST_NOTIFICATIONS`; "restricted settings" for sideloaded apps enabling accessibility.
- 14+: foreground-service types (we avoid FGS); stricter implicit intents.
- 15/16+: edge-to-edge enforcement; re-check new background/accessibility restrictions each year.

### 19.2 OEM handling
| OEM / ROM | Issue | Mitigation |
|---|---|---|
| Xiaomi/Redmi/POCO (MIUI/HyperOS) | Autostart off, aggressive kill, accessibility disabled after kill | Autostart deep link, "No restrictions" battery guide, lock-app-in-recents tip, watchdog |
| Oppo/Realme (ColorOS), OnePlus (OxygenOS 12+) | Background freeze | Startup manager deep link, battery "Allow background activity" |
| Vivo (FuntouchOS/OriginOS) | High background power consumption kill | Background power guide |
| Samsung (One UI) | "Sleeping apps"/"Deep sleeping" | Add to "Never sleeping apps" guide |
| Huawei/Honor (EMUI, no GMS) | No FCM/Google sign-in | Self mode fully works; Parent/Child fall back to periodic polling and email auth |
| Stock/Pixel/Motorola/Nokia | Standard | Battery optimization exemption |
Guides live in `src/features/onboarding/oem/` with deep-link intents + screenshots, based on dontkillmyapp.com knowledge.

### 19.3 Form factors
Phones 320–480 dp width, tablets (two-pane layouts on ≥ 600 dp), foldables (resizable, state preserved), landscape, font scale up to 200%, RTL.

---

## 20. Testing & QA

| Layer | Tooling | Scope |
|---|---|---|
| Domain unit tests | Jest | Rule evaluation, time windows across midnight/DST, grants, i18n key completeness |
| Shared evaluator vectors | JSON test vectors run by Jest **and** JUnit | Kotlin LimitEngine matches TS reference exactly |
| Native unit tests | JUnit + Robolectric | UsageTracker event math, Room DAOs, OEM helper |
| Component tests | React Native Testing Library | Screens, forms, RTL rendering, themes |
| Firestore rules | Firebase emulator + `@firebase/rules-unit-testing` | Access control |
| Worker | Vitest + Miniflare | Endpoints, quotas, provider failover, schema validation |
| E2E | Maestro (device/emulator) | Onboarding, set→exceed→block→remove→usable, schedule, pairing, more-time flow |
| Device matrix | Primary dev target: emulator AVD `Medium_Phone_API_36.1`; add emulators API 24/28/31/34; real OEM devices via Firebase Test Lab (Robo + Maestro) and closed-testing testers | Compatibility |
| Manual | Checklist per release | OEM behavior, battery, TalkBack, RTL, dark/light |
| Beta | Play closed testing (≥ 12 testers × 14 days, mixed OEMs) | Real-world |

Definition of Done for any phase: format + lint + typecheck + targeted tests green, diff reviewed, success criteria of the phase demonstrated on a real device where applicable.

---

## 21. Tooling, CI/CD & observability

- **Package manager:** pnpm. **Lint/format:** ESLint (expo config + custom rule banning `left/right` style props), Prettier, `tsc --noEmit`, ktlint/detekt for Kotlin.
- **Git:** trunk-based, conventional commits (`feat:`, `fix:`, `docs:`), feature branches per phase.
- **CI (GitHub Actions or GitLab CI):** install → lint → typecheck → Jest → Worker tests → Firestore rules tests → Android assemble (Gradle) → JUnit. Nightly: Maestro on emulator.
- **Builds:** EAS Build (Android AAB now; iOS later) or local Gradle; EAS Submit to Play internal track.
- **Versioning:** semver `versionName`; auto-incremented `versionCode` (EAS remote versioning).
- **OTA updates:** `expo-updates` for JS-only fixes (never to change permission behavior; policy-safe).
- **Observability:** Crashlytics (crashes, non-fatals, breadcrumbs without PII); opt-in, privacy-friendly analytics (screen views, feature usage counts), disclosed in Data Safety; Worker logs without prompt bodies.

---

## 22. Google Play compliance

| Area | Requirement | Our implementation |
|---|---|---|
| Accessibility API | Non-accessibility use needs prominent in-app disclosure + affirmative consent; Permission Declaration in Play Console; demo video | Disclosure screen (5.2), `isAccessibilityTool=false`, declaration + YouTube unlisted video of disclosure → enable → block |
| Usage access | Special permission; justify core use | Declared in listing + privacy policy |
| Package visibility | Avoid `QUERY_ALL_PACKAGES` | `<queries>` launcher intent only |
| Monitoring apps (stalkerware policy) | Only parental/enterprise monitoring; persistent notification; not hidden; IsMonitoringTool flag; clear listing description | Child-mode notification, visible icon, flag, listing states parental control |
| Device Admin | Avoid | Not used |
| Battery optimization exemption | Allowed when core function would break | Justified: enforcement service |
| Target API level | Latest required by Play | Checked at each release |
| Data Safety form | Declare collected/shared data | App activity (usage) collected for app functionality + optional AI; account info for Parent; crash logs; encrypted in transit; deletion available |
| Privacy policy | Public URL, in-app link | Hosted (GitHub Pages/Cloudflare Pages) |
| Account deletion | In-app + web | Implemented (17) |
| AI-generated content | In-app reporting of offensive output | "Report response" |
| Families / target audience | Apps targeting children must meet Families policy | Target audience 18+ (adults and parents); child mode is used on parent-managed devices, stated clearly |
| Content rating | IARC questionnaire | Everyone/PEGI 3 expected |
| Testing requirement | New personal accounts: closed test ≥ 12 testers for 14 continuous days before production | Planned in Phase 7 |
| Deceptive behavior | No fake claims | Honest copy |

Reviewer notes (in Play Console "App access"): steps to reproduce blocking, test account for Parent mode, explanation of accessibility use.

---

## 23. Apple App Store compliance (v2.0)

- Parental control and self-control apps must use the **Screen Time API** (not MDM, VPN or configuration profiles).
- Family Controls distribution entitlement approved by Apple for app + extensions.
- App Privacy "nutrition labels" consistent with the Play Data Safety form.
- Guideline 5.1 (privacy): minimal data, purpose strings, account deletion in-app.
- Guideline 1.3 / Kids Category: **not** listing in the Kids Category (the app is used by parents/adults).
- Sign in with Apple required if Google sign-in is offered on iOS.
- TestFlight beta before submission; review notes explaining Screen Time usage and a demo account.

---

## 24. Release process

### 24.1 Android (v1.0)
1. **Accounts:** Google Play Console developer account (personal or organization; organization accounts skip the 12-tester rule but need D-U-N-S), Firebase project, Cloudflare account, Groq + Gemini API keys.
2. **Signing:** Play App Signing enabled; upload key generated and stored securely (password manager + offline backup); never committed.
3. **Store setup:** app created, default language EN + UR translation, category *Productivity* (alt: *Parenting*), contact email, privacy policy URL, account-deletion URL.
4. **Policy declarations:** Accessibility declaration + video, Data Safety, content rating, target audience, ads (none), news (no), government (no), health (no), financial features (no), app access instructions.
5. **Internal testing track:** team smoke test on multiple OEMs.
6. **Closed testing:** ≥ 12 testers, 14 days, collect feedback via in-app form; fix issues.
7. **Production access application** (personal accounts) → **staged rollout** 10% → 25% → 50% → 100% while watching Android vitals and Crashlytics.
8. **Post-launch:** respond to reviews within 48 h; monthly releases; annual target-SDK upgrade before Play's deadline.

### 24.2 iOS (v2.0)
1. Apple Developer Program membership; request the Family Controls distribution entitlement early.
2. App ID + App Group + extensions' bundle IDs; EAS credentials.
3. Build via EAS (or Mac/Xcode); test on physical iPhones (iOS 16+ minimum for `.individual` authorization).
4. TestFlight internal → external beta.
5. App Store Connect listing, privacy labels, review notes → submit → phased release.

---

## 25. ASO — store listing & growth

### 25.1 Keyword strategy
Primary: screen time, app limit, app blocker, digital wellbeing, focus, parental control, social media limit, phone addiction. Secondary: study focus, dopamine detox, time limit apps, block apps, bedtime mode. Urdu listing: screen time control / موبائل استعمال کی حد / ایپ بلاکر. Validate volumes with Play Console search terms + keyword tools before launch; revisit monthly.

### 25.2 Listing draft (EN, finalize at launch)
- **Title (≤ 30):** "TimeTide: Screen Time Limit" (if name chosen) / "ScreenLimiter – App Limits"
- **Short description (≤ 80):** "Set app time limits, block distractions & grow focus with an AI coach."
- **Long description (≤ 4000), structure:** hook → 5 key benefits with keywords → features list (limits, schedules, focus, insights, AI coach, parental control, Urdu support, dark mode) → privacy promise → accessibility disclosure paragraph → call to action.
- **Graphics:** icon (wave + clock, tested at 48 px), feature graphic 1024×500, 8 phone screenshots (captioned benefit headlines, light + dark), 7" and 10" tablet screenshots, 30 s promo video (YouTube).
- **Localized listings:** EN, UR at launch; each new app language gets a listing translation.

### 25.3 Growth levers
In-App Review API after positive moments (7-day streak, first weekly report with improvement); shareable weekly-report cards (image, no personal data); referral for parents ("invite co-parent"); Play store listing experiments (A/B test icons and screenshots); keep Android vitals healthy (ranking factor).

---

## 26. Monetization (open decision)
Not decided. Options for later:
1. **Free** (costs covered by free tiers; donations).
2. **Freemium:** free core limits; premium = AI coach unlimited, parental multi-child, advanced insights, themes (Play Billing subscription).
3. **One-time unlock.**
Constraint: no ads (conflicts with wellbeing positioning and adds Data Safety burden). Architecture keeps a `entitlements` service so gating can be added without refactors.

---

## 27. Roadmap & phases

| # | Phase | Key deliverables | Success criteria |
|---|---|---|---|
| 0 | Setup & blocking spike | Toolchain (JDK 17, Android SDK), Expo project, git, lint/test harness, minimal accessibility service + block screen | On the Android emulator (AVD `Medium_Phone_API_36.1`, API 36), a chosen app is blocked 1 min after use starts; block disappears within 1 s when the rule is removed |
| 1 | Android native core | Full ScreenGuard module: app list, usage tracking, LimitEngine (all rule types), BlockActivity, Room, receivers, watchdog, shared test vectors | JUnit + Jest vectors green; rules survive reboot; usage within ±2 min of Digital Wellbeing |
| 2 | Design system & foundations | Tokens, light/dark/system + ripple switch, wave components, i18n (EN/UR) + RTL, navigation skeleton | 60 fps Home on mid-range device; language/theme switch works; missing-key CI check |
| 3 | Self-mode features | Onboarding + permissions + OEM guides, app list, limit editor (all types), schedules, focus, block actions, friction unlock, notifications, permission health | Maestro: onboarding; set → exceed → block → remove → usable; schedule across midnight |
| 4 | Insights, gamification, widgets | Charts, heatmap, streaks, ocean world, badges, widgets, data export | 7-day data correct vs source; widgets update |
| 5 | Cloud & parental | Firebase project, Worker (pairing, notify), security rules, parent/child flows, requests, tamper alerts | Remote rule applied < 10 s online; offline enforcement; rules tests green |
| 6 | AI | Worker AI endpoints, Groq + Gemini failover, quotas, suggestions, intent check, coach chat, weekly reports, report-response | Key never in app; quotas enforced; app fully usable with AI off |
| 7 | Hardening & release | OEM matrix testing, performance/battery budgets, accessibility audit, policy docs, privacy policy site, store listing, closed testing, production rollout | Play review approved; crash-free ≥ 99.5% in closed test |
| 8 | iOS (v2.0) | Parent mode on iOS, Swift ScreenGuard, extensions, entitlement, TestFlight, App Store | App Store approval |

---

## 28. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Play rejects accessibility use | Launch blocked | Follow disclosure/declaration exactly; minimal event types; video; clear listing; fallback design using UsageStats polling + notification-only enforcement (degraded) |
| OEMs kill the service | Limits not enforced | OEM guides, watchdog, permission health, self-healing, testing matrix |
| Free AI tier limits too low at scale | AI unavailable | Per-user quotas, small models, caching, failover, graceful degradation; monetization later |
| Firestore free quota exceeded | Parental sync fails | Write budgets, hourly rollups, move to Blaze when needed |
| Background activity launch restricted in future Android | Block UI fails | Fallback: GLOBAL_ACTION_HOME + notification; yearly re-validation |
| iOS entitlement delay | iOS launch slips | Request early; ship parent mode on iOS first |
| Child bypass (safe mode, profiles) | Weak parental control | Heartbeat alerts; documented limitations |
| Urdu Nastaliq layout issues | Broken UI | Early font integration in Phase 2; visual tests in RTL |

---

## 29. Open questions
1. Final app/store name (TimeTide / ScreenTide / Limitly / other): check availability.
2. Monetization model (section 26).
3. Play developer account type: personal (12-tester rule) or organization.
4. Git hosting (GitHub vs GitLab) for CI.
5. Website limits in v1.x require `canRetrieveWindowContent=true`, which means a stronger disclosure. Confirm before building.

---

## 30. Glossary
- **LimitEngine:** native evaluator deciding allow/block.
- **ScreenGuard:** the cross-platform native module contract.
- **Grant:** temporary extra time for an app.
- **Heartbeat:** periodic child-device status report.
- **Friction unlock:** small effort required before extra time.
- **BAL:** Android background activity launch restrictions.
- **OEM:** phone manufacturer (Xiaomi, Samsung…).
- **ASO:** App Store Optimization.
