# Roadmap: ScreenLimiter

## Overview

ScreenLimiter is built as a vertical MVP on the Android emulator (AVD `Medium_Phone_API_36.1`, API 36). Phase 1 lays a reproducible Expo SDK 57 foundation, freezes the `ScreenGuard` contract with shared test vectors, and runs the gating block-launch spike. Phase 2 delivers the thinnest end-to-end version of the core value: set a daily limit, the app gets blocked, remove the limit, the app is usable again. Phases 3-5 deepen enforcement until it is trustworthy: always-on behaviour, every limit type, and a humane block experience. Phases 6-8 make it a premium bilingual self-mode product with the wave design system, English and Urdu (RTL), Play-compliant onboarding, and insights/gamification/widgets. Phases 9-10 add parental control using only free Firebase services (no separate backend). Phase 11 adds the decoupled free-tier Groq AI coach, called directly from the app. Phase 12 hardens the app across Android versions and real OEM devices and ships it through Google Play review. iOS (v2 requirements) is not in this roadmap; the frozen `ScreenGuard` contract keeps it addable later without touching shared TypeScript.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Block-Launch Spike** - Reproducible Expo build, quality tooling, ScreenGuard contract + test vectors, and the API 36 block-launch gate
- [ ] **Phase 2: First Enforcement Slice** - Daily limit on an app → blocked when time runs out → remove limit → usable instantly
- [ ] **Phase 3: Always-On Enforcement** - Blocking survives JS death, offline, reboot, clock changes and side-door re-entry; watchdog warns when protection stops
- [ ] **Phase 4: All Limit Types & Focus Mode** - Group/category, downtime, session and opens limits, precedence rules, focus sessions, Kotlin = TS on every vector
- [ ] **Phase 5: Block Experience & Warnings** - Block screen reasons, breathing, friction unlock for extra time, pre-limit and daily-summary notifications
- [ ] **Phase 6: Wave Design System & Localization** - Themes with ripple switch, Liquid Time wave components at 60 fps, accessibility, English + Urdu with full RTL
- [ ] **Phase 7: Onboarding & Permission Compliance** - First-run flow, Play-compliant accessibility disclosure, permission guidance, OEM guides, Permissions Health
- [ ] **Phase 8: Insights, Gamification & Widgets** - Usage insights, streaks, ocean world, badges, home-screen widget, data export/delete, in-app review
- [ ] **Phase 9: Family Cloud & Child Pairing** - Firebase-only foundation (no separate backend), security rules, parent sign-in, QR/code pairing, Parent PIN, managed notification
- [ ] **Phase 10: Remote Parental Control** - Parent dashboard, remote limits online/offline, extra-time requests, tamper alerts, multi-child family management
- [ ] **Phase 11: AI Coach** - Free Groq API suggestions, intent check, nudges, coach chat, weekly reports, quotas, graceful degradation
- [ ] **Phase 12: Hardening & Play Release** - Android 7→16 and real-OEM verification, performance budgets, compliance, store listing, closed testing, rollout

## Phase Details

### Phase 1: Foundation & Block-Launch Spike

**Goal**: A reproducible Expo SDK 57 project runs on the emulator with full quality tooling, the shared enforcement contract is frozen, and the API 36 block-launch question is answered with a working fallback before any enforcement code depends on it
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05
**Success Criteria** (what must be TRUE):

  1. From a clean checkout, the documented commands build and launch the app (Expo SDK 57, New Architecture, TypeScript ~5.9) on AVD `Medium_Phone_API_36.1`
  2. `npx expo prebuild --clean` regenerates the same Android project: manifest entries, accessibility-service XML, `<queries>` and permissions all come from config plugins, and `android/` is never hand-edited
  3. With the spike accessibility service enabled, opening a designated test app on API 36 is interrupted either by the block Activity or by the `GLOBAL_ACTION_HOME` + notification fallback. Both paths have been exercised, and which one is primary is recorded as a decision
  4. ESLint (including the no-left/right style rule), Prettier, `tsc --noEmit`, Jest, ktlint and JUnit each run with a single command and pass
  5. The `ScreenGuard` TypeScript contract (`AppRef`, `Capabilities`, `PermissionState`, rule types) and the shared JSON rule-evaluation test vectors exist and load in both the Jest and JUnit harnesses before either evaluator is written

**Plans**: 1/8 plans executed (sequential waves 1–8; one shared emulator + generated android/)

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Walking-skeleton tracer: package-legitimacy gate, Expo SDK 57 + Router + local `screen-guard` module, Home ↔ Kotlin ↔ SharedPreferences round trip on the emulator, E2E harness (FND-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — JS quality gates: ESLint 9 + self-tested RTL rule, Prettier, tsc, Jest/RNTL with real tests (FND-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03-PLAN.md — Frozen `ScreenGuard` contract + 21 shared rule-evaluation vectors loaded in Jest, no evaluator (FND-05)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-04-PLAN.md — Block path tracer: config plugin (service, BlockActivity, queries, accessibility XML, permissions) + activity-first cascade with `GLOBAL_ACTION_HOME` + notification fallback (FND-02, FND-03)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-05-PLAN.md — `prebuild --clean` reproducibility/idempotence gate + APK permission/SDK audit (FND-02)

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 01-06-PLAN.md — Kotlin gates: ktlint + JUnit loading the same vectors + block-path invariant test (FND-04, FND-05)

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 01-07-PLAN.md — Block-launch spike on API 36 (5 trials per path) + recorded primary-path decision (FND-03)

**Wave 8** *(blocked on Wave 7 completion)*

- [ ] 01-08-PLAN.md — docs/DEVELOPMENT.md, `pnpm verify`, fresh-clone build on the emulator, finalized SKELETON.md (FND-01, FND-04)

**Notes**: Research flag: the BAL spike is a gate. A "fallback-only" result is a valid, planned outcome, not a reason to re-spike. Pin TypeScript ~5.9.3 (7.x breaks `app.config.ts`); compile/target SDK 36, minSdk 24.

### Phase 2: First Enforcement Slice

**Goal**: User can put a daily limit on an app, have it blocked when time runs out, and remove the limit to use the app again instantly. This is the core value working end to end on the emulator
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: ENF-01, ENF-03, ENF-07, LIM-01, LIM-06, LIM-07, BLK-01
**Success Criteria** (what must be TRUE):

  1. User sees every launchable app with name, icon and category. ScreenLimiter, the launcher, dialer, emergency apps and Settings are excluded, and the merged manifest contains no `QUERY_ALL_PACKAGES`
  2. User sets a daily limit (5 min to 23 h 55 min, optionally per weekday) on one or more apps. Once today's usage reaches it, the block screen covers the app within 1.5 s, or the Phase 1 fallback sends the user home
  3. Today's per-app foreground minutes and opens are recorded from usage events and match a timed reference session within ±2 min (the Digital Wellbeing accuracy bar)
  4. While an app is blocked, the user toggles its limit off, raises it, or deletes it, with no lock or cooldown. The block screen closes within 1 s and the app is usable. Turning the limit back on blocks the app again immediately
  5. Limits and usage history persist in native Room storage across force-stop and relaunch, and usage history is kept for 90 days

**Plans**: TBD
**UI hint**: yes

### Phase 3: Always-On Enforcement

**Goal**: Enforcement keeps working under hostile conditions (JS runtime dead, offline, reboot, clock changed, app re-entered through side doors), and the user is told when protection stops
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: ENF-02, ENF-04, ENF-06, ENF-08, ENF-09, BLK-05
**Success Criteria** (what must be TRUE):

  1. A limited app is still blocked when its limit is reached, without opening ScreenLimiter, when the React Native process is killed, when the device is in airplane mode, and after a reboot
  2. Returning to a blocked app through back, recents, a notification tap or split-screen shows the block again
  3. Screen-off time does not count toward limits, while split-screen and picture-in-picture use does
  4. Changing the device clock or timezone immediately recomputes the day boundary and re-evaluates rules. Running session timers are unaffected because they use monotonic time
  5. Installing or uninstalling an app updates the app list within 5 s. Disabling or killing the accessibility service produces a "protection paused" notification with a fix link within 15 min

**Plans**: TBD
**Notes**: Research recommends a lightweight real-device smoke pass (Xiaomi/Samsung through Firebase Test Lab) once this phase works, because passing on the emulator says nothing about OEM background killing. The full OEM matrix is QUAL-04 in Phase 12.

### Phase 4: All Limit Types & Focus Mode

**Goal**: User can set every kind of limit (shared group/category, downtime schedule, session, opens) and start focus sessions with one tap. Precedence is proven identical in Kotlin and TypeScript
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: LIM-02, LIM-03, LIM-04, LIM-05, LIM-08, LIM-09, ENF-05
**Success Criteria** (what must be TRUE):

  1. User sets a shared daily limit on a category or a custom group, and every app in it is blocked once their combined usage reaches the limit
  2. User creates a downtime schedule per weekday, including windows that cross midnight, that blocks all or selected apps while allowlisted apps stay usable
  3. User sets a session limit (session length + break) and a maximum-opens-per-day limit. The app is blocked after the session until the break has passed, and after the Nth open
  4. When several limits apply, the most restrictive one wins and globally allowlisted apps are never blocked. The Kotlin `LimitEngine` and the TS reference evaluator agree on every shared test vector in CI
  5. User starts a focus session (25/50/90 min or custom; presets Study/Work/Sleep) during which only allowlisted apps open, and can end it early

**Plans**: TBD
**UI hint**: yes

### Phase 5: Block Experience & Warnings

**Goal**: Reaching a limit is humane and informative. The user is warned ahead of time, told why an app is blocked and when it frees up, and can earn a few extra minutes through a mindful step
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: BLK-02, BLK-03, BLK-04, NOTF-01
**Success Criteria** (what must be TRUE):

  1. The block screen shows the app, the reason (daily / downtime / session / opens) and when it becomes available again. All copy comes from localizable string resources
  2. From the block screen the user can close the app or do a 30 s breathing exercise
  3. After a friction step (breathing, typed phrase, or wait timer) the user gets extra time (default 5 min, at most 3 per app per day, both configurable), and the app is usable for exactly that grant. A request past the daily maximum is refused
  4. User is notified at 80% of a limit and at 5 min left (thresholds configurable), receives a daily summary, and can turn each notification channel on or off

**Plans**: TBD
**UI hint**: yes

### Phase 6: Wave Design System & Localization

**Goal**: The app looks premium and reads natively in English and Urdu, with token-based light/dark themes, the animated wave language at 60 fps, accessibility built in, and full RTL
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, I18N-01, I18N-02, I18N-03, I18N-04
**Success Criteria** (what must be TRUE):

  1. User switches between Light, Dark and System themes with an animated ripple reveal, and the choice persists across restarts
  2. Home shows the "Liquid Time" wave, whose level and color reflect remaining time. WaveRing, WaveBackground, WaveTabBar and the DurationDial (with haptic ticks) render at 60 fps on the reference emulator. With Reduce Motion on, idle waves stop and transitions become fades
  3. When the user switches between English and Urdu, all UI, notifications and the native block screen change language. In Urdu the layout mirrors to RTL and Nastaliq text renders without clipping
  4. Dates, times, numbers and durations follow the selected locale via `Intl`. Adding a language takes one JSON file plus one registry entry, and CI fails if any key is missing compared with English
  5. All text meets WCAG AA contrast in both themes, controls have TalkBack labels and 48 dp targets, and screens stay usable at 200% font scale

**Plans**: TBD
**UI hint**: yes
**Notes**: Research flags: Urdu line-height is a font-specific token. Carry an RTL visual-QA checklist into every later UI phase, and have each later phase ship EN + UR strings. Profile Skia/Reanimated idle loops for battery.

### Phase 7: Onboarding & Permission Compliance

**Goal**: A new user goes from first launch to a first working limit through a Play-compliant disclosure and permission flow that holds up on major OEMs
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, ONB-06
**Success Criteria** (what must be TRUE):

  1. On first launch the user picks a language, sees a 3-slide welcome, and chooses a mode (Self / Parent / Child) and a theme
  2. Before accessibility settings open, the user sees a prominent disclosure (what is accessed, why, and what is never accessed) and must tap an explicit consent button. Declining never opens settings
  3. The user is guided to grant Usage Access, Accessibility, Notifications and the battery-optimization exemption, and each grant is detected automatically on return. This includes the Android 13+ "Allow restricted settings" path for sideloaded builds
  4. On Xiaomi/Redmi/POCO, Oppo/Realme/OnePlus, Vivo, Samsung and Huawei, the user sees brand-specific autostart/background guidance with deep links and fallbacks. A user who skips permissions sees a persistent banner and a Permissions Health screen with live status and fix links
  5. When usage history is available, onboarding shows the last 7 days and guides the user into creating a first limit

**Plans**: TBD
**UI hint**: yes

### Phase 8: Insights, Gamification & Widgets

**Goal**: User understands their usage and stays motivated through insights, streaks, a growing ocean world, badges and a home-screen widget, and has full control over their own data
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: INS-01, INS-02, INS-03, GAM-01, GAM-02, WID-01, SET-01, REL-06
**Success Criteria** (what must be TRUE):

  1. User views today's total screen time, pickups, top apps and per-app timeline, plus a week/month category breakdown, the trend against the previous period, and a 7×24 hourly heatmap, all matching the native usage records
  2. User opens an app detail page showing usage history, opens, applied limits and extensions taken
  3. User earns a streak for each day all limits are respected, with a streak freeze every 7 days. The Home ocean world grows with the streak, badges unlock with a celebration animation, and a positive moment such as a 7-day streak triggers the Play In-App Review prompt
  4. User adds a home-screen widget that shows today's total and the top limited apps with remaining time, and it refreshes in the background
  5. User exports their data as JSON or CSV and can delete all local data from Settings

**Plans**: TBD
**UI hint**: yes
**Notes**: Research flags: run the widget engine spike first (Jetpack Glance is the default, react-native-android-widget the alternative) and decide on measured battery cost. Re-profile animation load once the ocean world is added.

### Phase 9: Family Cloud & Child Pairing

**Goal**: A parent can create a family and pair a child's phone, which is then PIN-locked and visibly managed. The cloud layer's security rules are proven before any client writes
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: PAR-01, PAR-02, PAR-03, PAR-04, PAR-11
**Success Criteria** (what must be TRUE):

  1. Firestore security-rules emulator tests pass and show that parents can only access their own family and child devices only their own data. The rules are in place before any client writes
  2. Parent signs in with Google or email and creates a family
  3. Parent adds a child and pairs the child's phone by QR code or 6-digit code. Each code works only once and expires after 10 min
  4. On the child phone, changing settings or limits and leaving child mode require the Parent PIN, and 5 wrong attempts trigger a lockout
  5. While in child mode, the child phone shows a persistent, non-dismissible "Managed by <family>" notification

**Plans**: TBD
**UI hint**: yes
**Notes**: No separate backend and no paid services (user constraint). Pairing uses Firebase Anonymous Auth on the child plus a Firestore pairing-code document validated purely by security rules (single use via transaction, 10 min expiry). Use `@react-native-firebase`, not the JS SDK, for Firestore offline persistence and Crashlytics. Wire the IsMonitoringTool flag through a config plugin so every track gets it.

### Phase 10: Remote Parental Control

**Goal**: A parent can see and control a child's phone remotely (usage, limits, extra-time requests, tamper alerts) whether the child is online or offline
**Mode:** mvp
**Depends on**: Phase 9
**Requirements**: PAR-05, PAR-06, PAR-07, PAR-08, PAR-09, PAR-10
**Success Criteria** (what must be TRUE):

  1. Parent sees each child's today/week usage, top apps, active limits and protection status
  2. Parent creates, edits, toggles or removes any limit type for a child, and an online child applies it within 10 s via a native Firestore listener in the always-running enforcement process (no server push). An offline child keeps enforcing its cached rules and applies pending changes on reconnect
  3. Child requests more time (15/30/60 min plus a note). The parent sees it instantly while the app is open (within 15 min via a background check otherwise), approves or denies it, and an approved grant applies on the child
  4. Parent is alerted (instantly with the app open, within 15 min otherwise, via local notifications) when protection is disabled on the child phone, when the phone misses heartbeats for 6 h, or when wrong PIN attempts occur
  5. Parent manages multiple children, invites a co-parent, removes a device (which clears rules on the child) and can delete the family

**Plans**: TBD
**UI hint**: yes
**Notes**: No server-side push: the child listens to its rules natively; the parent uses Firestore listeners in the foreground and a WorkManager periodic check + local notifications in the background. Keep listener discipline and hourly rollups to stay inside Firestore Spark quotas.

### Phase 11: AI Coach

**Goal**: Users get free-tier AI help (limit suggestions, intent checks, nudges, a coach, weekly reports) that never weakens enforcement or exposes keys
**Mode:** mvp
**Depends on**: Phase 10
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08
**Success Criteria** (what must be TRUE):

  1. User gets smart limit suggestions from 7-28 days of usage and applies one with a single tap
  2. A user who opts in is asked why they are opening a distracting app before it is allowed, timed, or a break is suggested. Long continuous sessions, rapid switching between distracting apps, and late-night use trigger on-device nudges
  3. User chats with the AI coach in their selected language and can accept its one-tap actions. The user, and a parent for each child, receive a weekly report with a headline, wins, watch-outs and one suggestion
  4. AI calls go directly from the app to the free Groq API behind a provider-agnostic client, with a per-install daily quota and backoff on rate limits. The app shows the remaining quota, and the user can report any AI response
  5. With AI offline or out of quota, every AI entry point shows an explicit "try again later" state and the rest of the app works normally. The Groq key is not hardcoded in the binary: it is delivered via Firebase Remote Config and can be rotated without an app update

**Plans**: TBD
**UI hint**: yes
**Notes**: Per-child weekly reports need Phase 10. Known trade-off (accepted for zero-backend, zero-cost): a determined user can extract the Groq key from the running app, and the free quota is shared by all users; mitigate with Remote Config rotation, per-install caps and graceful degradation.

### Phase 12: Hardening & Play Release

**Goal**: ScreenLimiter is proven across Android versions and real OEM devices, meets its performance budgets, and reaches users through Google Play review
**Mode:** mvp
**Depends on**: Phase 11
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, REL-01, REL-02, REL-03, REL-04, REL-05
**Success Criteria** (what must be TRUE):

  1. Limits enforce correctly from Android 7.0 (API 24) through API 36, and on real Xiaomi and Samsung devices (Firebase Test Lab or testers)
  2. On a mid-range profile, cold start is under 2 s, battery use under 2 %/day and background memory under 60 MB
  3. A signed AAB targeting the current Play-required API level (36, re-checked at release) ships with Play App Signing. Public privacy policy and account-deletion pages are linked in-app, and in-app account deletion works
  4. Play Console declarations are complete (Accessibility declaration + demo video, Data Safety, content rating, 18+ target audience, monitoring-tool flag, reviewer notes), and the store listing is published in English and Urdu with researched keywords
  5. Closed testing with at least 15 testers for 14 days shows Crashlytics active with no PII and at least 99.5% crash-free users. Play review passes and a staged rollout begins

**Plans**: TBD
**Notes**: Re-fetch the Play target-API requirement before submitting. Recruit 15-18 testers as a buffer. Re-run the Phase 1 BAL spike on the latest Android release. Add Firestore and AI quota alerting before rollout.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Block-Launch Spike | 1/8 | In Progress|  |
| 2. First Enforcement Slice | 0/TBD | Not started | - |
| 3. Always-On Enforcement | 0/TBD | Not started | - |
| 4. All Limit Types & Focus Mode | 0/TBD | Not started | - |
| 5. Block Experience & Warnings | 0/TBD | Not started | - |
| 6. Wave Design System & Localization | 0/TBD | Not started | - |
| 7. Onboarding & Permission Compliance | 0/TBD | Not started | - |
| 8. Insights, Gamification & Widgets | 0/TBD | Not started | - |
| 9. Family Cloud & Child Pairing | 0/TBD | Not started | - |
| 10. Remote Parental Control | 0/TBD | Not started | - |
| 11. AI Coach | 0/TBD | Not started | - |
| 12. Hardening & Play Release | 0/TBD | Not started | - |
