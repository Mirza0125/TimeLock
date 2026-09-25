# Feature Research

**Domain:** Android-first screen-time limiter / app blocker with self-control and parental-control modes plus a free-tier AI coach
**Researched:** 2026-09-25
**Confidence:** MEDIUM (cross-verified web sources across 11 competitors and multiple review aggregators; no official/curated docs source exists for competitive-intelligence research, so nothing here reaches HIGH — see Sources)

**Competitors surveyed:** Google Digital Wellbeing & Family Link, Apple Screen Time, Opal, one sec, ScreenZen, AppBlock, StayFree, Freedom, Qustodio, Bark, OurPact.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or gets 2-star reviews.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| App discovery / installed-app list with icons & category | Every competitor (Digital Wellbeing, AppBlock, ScreenZen, Qustodio) lets users pick which apps to control — without it there's nothing to limit | LOW | Spec §6.1. No `QUERY_ALL_PACKAGES`; `<queries>` + MAIN/LAUNCHER suffices |
| Per-app usage tracking & daily totals | Foundational to the entire category (Digital Wellbeing app timers, StayFree stats, Qustodio reports) — it's the first thing users check | MEDIUM | Spec §6.2. `UsageStatsManager` events + accessibility for live ticking; ±2 min accuracy is the informal bar Digital Wellbeing sets |
| Per-app daily time limit with hard block | The feature that defines "app blocker" — every competitor has it (Family Link timers, Apple App Limits, AppBlock, ScreenZen) | MEDIUM | Spec §6.3 |
| Schedule / downtime (bedtime, school/work hours) | Apple Downtime, Family Link Bedtime, Qustodio/Bark/OurPact scheduling — assumed by both self and parental users | MEDIUM | Spec §6.3 |
| Full-screen block experience when a limit is hit | Users need an unmissable stop signal (Apple's grayed-out icon, AppBlock's overlay, Family Link's block screen) | MEDIUM | Spec §6.4 |
| Pre-limit warning notifications | Digital Wellbeing, StayFree, Qustodio all warn before the hard stop; an unannounced block feels punitive | LOW | Spec §6.3/§6.9 |
| Focus / "only allowed apps" session mode | Digital Wellbeing Focus Mode, Freedom sessions, Opal Deep Focus — a one-tap distraction-free mode is assumed in 2026 | MEDIUM | Spec §6.6 |
| Usage insights dashboard (today/week/trend) | Every competitor surfaces history; users compare against past weeks (Qustodio reports, StayFree stats, Digital Wellbeing dashboard) | MEDIUM | Spec §6.7 |
| Home-screen widget | Digital Wellbeing and most modern blockers ship one; users expect an at-a-glance check without opening the app | LOW | Spec §6.10 |
| Parent-child pairing + remote limit setting | Category-defining for parental apps (Family Link, Qustodio, Bark, OurPact) — a parental app that can't set rules remotely isn't one | MEDIUM | Spec §7.1/§7.3 |
| Parent dashboard (child usage, device/protection status) | Qustodio/Bark/OurPact dashboards are the primary parent touchpoint | MEDIUM | Spec §7.2 |
| Visible "managed by parent" notification | Non-negotiable under Google Play's monitoring-app policy (confirmed via Play developer policy docs) and a trust signal post stalkerware scandals; Bark/OurPact both show one | LOW | Spec §5.4 — policy-required, not optional |
| Working free tier (not a crippled trial) | The category punishes free-tier gating in reviews: Opal's best mode (Deep Focus) is paywalled, one sec's free tier "frequently prompts to upgrade instead of" delivering the core exercise | N/A — positioning, not a feature | Reinforces the "free-tier AI only" and no-ads decisions already made |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable — and each should trace back to the Core Value in PROJECT.md.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Self **and** parental modes in one app | Every self-blocker researched (Opal, Freedom, one sec, ScreenZen, AppBlock, StayFree) ignores parental use; every parental suite (Qustodio, Bark, OurPact, Family Link) ignores self-control AI/UX. One app removes the "which app do I even need" decision and lets a parent self-limit on the same device | HIGH | Spec §5; one shared `LimitEngine`/rules model already designed to serve both |
| "Liquid Time" wave visual language across the whole app | No competitor in the category has a cohesive motion identity — Digital Wellbeing/Family Link are utilitarian, Qustodio/Bark are dashboard-y, Opal is the closest to "beautiful" but is iOS/Mac-only and its best mode is paywalled | HIGH | Spec §10; the differentiator only holds if 60fps + Reduce Motion budgets (spec §18) are actually met — a laggy wave is worse than no wave |
| Free-tier AI coach wired to real enforcement data (suggestions, intent check, weekly report) | Generic AI-coach apps (Habit Coach AI, BeeDone) aren't wired to actual per-app limits; screen-time-specific AI apps (e.g. "Dr. Screentime") aren't also full blockers + parental suites. Ours can one-tap *apply* a suggestion directly to a real limit | HIGH | Spec §8; must degrade gracefully offline/quota-exhausted (already a hard requirement — good) |
| Native, always-on Android enforcement without a paywalled "strict mode" | Opal's own reviewers note "Android blocking cannot be as rigorous [without a Screen Time API]" — competitors concede this is a real Android gap | MED-HIGH | Spec §6.3/§13; the watchdog + OEM autostart guides (§19.2) directly target the gap that makes Android blockers flaky |
| First-class Urdu + RTL, one-file-per-language i18n | All 11 researched competitors are English-first with bolted-on translations; none treat a second language/script as a design pillar | MEDIUM | Spec §11 |
| Doom-scroll nudges from on-device heuristics (not just open-time friction) | one sec/ScreenZen only add friction at the moment of opening an app; a nudge that fires mid-session (continuous-use or late-night heuristic) intervenes during the behavior itself | MEDIUM | Spec §8.3; on-device, works without the AI backend at all |
| Growing "ocean world" gamification tied to streaks | Opal's gems/leaderboard is the closest analog; a persistent visual world (vs. points) reinforces the wave brand and is a distinct emotional hook | MEDIUM | Spec §6.8 |
| Transparent in-app AI quota display | one sec's top complaint is the free tier "frequently prompts to upgrade" without explaining why; showing remaining quota converts an ambush into an expectation | LOW | Spec §8.1 — cheap trust-builder, do not skip it |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. **These map to decisions already made — the entries below explain *why* those calls were right and log the trade-off being accepted.**

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Strict / Lock mode (uncancellable blocks) | Heavily marketed by Opal (Deep Focus), Freedom (Locked Mode), AppBlock (Strict Mode); these vendors report the biggest self-reported usage drops on this mode | Coercion contradicts "user stays in control" positioning; an app that actively fights the user's own attempt to disable it is the exact pattern Play's accessibility-abuse review scrutinizes | Friction unlock (breathing / typed phrase / wait-timer, spec §6.5) + AI intent check gives resistance without removing control. **Trade-off logged:** competitors with a lock mode market measurable adherence gains from it that ScreenLimiter deliberately forgoes |
| Device Admin / uninstall prevention | Parents ask for "make sure they can't just delete it" — OurPact/Bark reviewers wish for stronger tamper-proofing | Play's monitoring-app policy treats uninstall-blocking/Device-Admin patterns as stalkerware-adjacent; Bark's own "tamper-proof" marketing backfired in reviews when kids still found workarounds, which damaged trust further than an honest limitation would have | PIN-locked settings + tamper alerts (permission revoked, missing heartbeat, wrong PIN — spec §7.6), already the chosen design. **Trade-off logged:** a determined teen can still uninstall; the app detects it after the fact instead of preventing it |
| Stealth / hidden child-monitoring mode | Some parents want the child unaware they're monitored | Explicitly banned by Google Play's stalkerware/monitoring-app policy (persistent notification + unique icon are required, confirmed against current Play developer policy); teens' own reviews of Bark call covert-feeling monitoring "invasive," eroding the parent-child trust the product depends on | Always-visible "managed by family" notification (spec §5.4) |
| Location tracking, message/call content reading, browsing-history export, camera/mic, keystroke logging | Parental suites (Qustodio, Bark) build whole feature sets around this, and parents do ask "what if something's wrong beyond screen time" | Play stalkerware-policy risk, a much heavier Data Safety disclosure burden, and scope creep into a higher-liability product category than "screen time" | Stay scoped to app-level usage + limits; state the limitation plainly in the listing so parent expectations are set correctly |
| VPN-based blocking / DNS filtering | Looks like a way to guarantee unbypassable blocking, including in-browser content | Extra intrusive permission surface, plus reliability cost the category already suffers from — Freedom's reviewers flag poor Windows/VPN behavior, OurPact's VPN profile "disconnects randomly" — and conflicts with the "minimal permissions" Play-approval priority | Accessibility service + `UsageStatsManager`, as already decided |
| Granular in-app content blocking (e.g. "block Reels but allow Instagram") | StayFree advertises exactly this and draws its lowest-rated complaints for not delivering it — users clearly want it | Requires reading on-screen content (`canRetrieveWindowContent=true`), a much stronger accessibility disclosure, and heuristics that break every OS/app update — high risk for a "nice to have" | App/category-level blocking now; website/content-level limits already deferred to v1.x with a stronger disclosure (PROJECT.md Out of Scope) |
| Best features paywalled behind a subscription (Opal's Deep Focus, AppBlock's "$20/year" gate) | Common monetization pattern in the category | Given the "free-tier AI only" decision and an undecided monetization model, shipping a deliberately crippled free experience invites the exact backlash Opal/one sec get ("free version just nags to upgrade") | Ship full core enforcement free at launch; the existing `entitlements` seam (PROJECT.md) reserves room for optional premium add-ons decided later |
| Mandatory account/sign-in for Self mode | Some competitors (Qustodio) require account creation even for pure self-use — an easy default to reach for | Adds onboarding friction, a Data-Safety disclosure surface, and a support burden (password reset, etc.) for a mode with no server dependency | Self mode stays fully offline/accountless, as already specified; only Parent/Child modes need Firebase Auth |

---

## Common User Complaints to Design Against

Pulled from Play Store / App Store reviews and review-aggregator analyses of the 11 competitors (WebSearch, cross-checked across multiple independent sources per claim → MEDIUM confidence).

| Complaint pattern | Seen in | Design response already in spec (or gap to flag) |
|---|---|---|
| Bypass via reboot, clearing app data, disabling accessibility silently, or changing the system clock | Family Link, general parental-control commentary | Boot receiver re-establishes enforcement (§13.3); `WatchdogWorker` + tamper alerts catch a disabled service (§6.12, §7.6); clock-change recompute (§13.4). **Confirm this covers "clear Play Store app data" style resets on OEM ROMs, not just this app's own data.** |
| Limit already open in another window/tab still usable ("easy to cheat") | StayFree (2.4/5, "easy to cheat with a window already open") | LimitEngine's 1s tick while a limited app is foreground (§6.3) should already close this gap — verify the tick fires even when the app was foregrounded *before* the limit was set/edited |
| OEM battery managers silently kill the background service, breaking enforcement | Cross-cutting complaint for every Android blocker (dontkillmyapp-class issues); implicit in AppBlock/StayFree low ratings | Already addressed: OEM-specific onboarding guides + permission-health watchdog (§19.2, §6.12) — keep this a first-class QA gate, not an afterthought |
| Overclaiming "tamper-proof"/"unbypassable" and then a bypass surfaces anyway | Bark ("parental controls can be bypassed despite being advertised as tamper-proof") | Do **not** market PIN + tamper alerts as unbypassable in store copy or onboarding; frame it honestly as "we'll tell you if protection is off," matching the actual design decision |
| Feature promised in marketing but not actually delivered (e.g. blocking Reels/Stories specifically) | StayFree | Do not let ASO copy (spec §25) imply granular in-app content blocking; v1 blocks at the app/category level only |
| Reliability regressions after OS/app updates — rules silently revert to "Always Allow," sync disconnects | OurPact ("apps tend to revert to Always Allow," "loses connection... without warning") | Heartbeat (§7.6) + sync-on-app-start/15-min/network-regain (§7.3) should catch this class of failure; add a regression test that specifically re-applies rules after a simulated OS update / process kill |
| Invasive/creepy feeling reported by monitored teens, damaging parent-child trust | Bark ("reviews from teens... describing the experience as invasive") | The chosen design (usage + limits only, no content/location/message access, visible notification, child can request more time) is the right mitigation — keep child-facing copy encouraging, not surveillance-toned (spec §8.4 already sets this tone for AI; extend it to all child-facing UI) |
| Free tier feels like a bait-and-switch upsell nag | one sec ("free version frequently prompts to upgrade... instead of providing the [core] feature") | Spec already commits to a working free tier and showing AI quota remaining (§8.1) — hold the line on this during monetization design (§26) |
| Billing/subscription friction: surprise auto-renewals, hard-to-cancel, slow support | Opal, Qustodio (Trustpilot: "difficulty canceling subscriptions, billing issues") | Not yet relevant (monetization undecided, §26) — flag as a requirement *when* monetization is designed: transparent renewal reminders, in-app cancel, no dark patterns |
| Permission setup feels long/confusing (multiple special permissions across screens) | Implicit across all Android blockers requiring accessibility + usage access + battery-exemption | Spec's staged onboarding with per-permission explainers (§5.2) is the right shape; user-test the sequence specifically for drop-off, since this is also the step most likely to fail Play review if done poorly (§22) |
| Legitimate school/work apps accidentally blocked by category rules | General parental-control complaint pattern (over-broad category blocking) | Category map + per-app override already exists (§6.1/§6.3); make sure the allowlist UX for schedules/groups is easy to find, not buried |

---

## Feature Dependencies

```
App discovery (6.1)
    └──requires──> nothing (foundation)
    └──enables───> Limits (6.3), Focus mode allowlist (6.6)

Usage tracking (6.2)
    └──requires──> App discovery (6.1), Accessibility + Usage Access permission
    └──enables───> Limits evaluation (session/open-count need live usage),
                    Insights (6.7), Widgets (6.10),
                    AI smart suggestions (8.3 — needs 7–28 days of data),
                    Doom-scroll nudges (8.3 — needs live foreground state)

Limits / LimitEngine (6.3)
    └──requires──> App discovery (6.1), Usage tracking (6.2)
    └──enables───> Block experience (6.4), Gamification streaks (6.8),
                    Notifications/warnings (6.9), Widgets (6.10)

Block experience (6.4)
    └──requires──> Limits / LimitEngine (6.3)
    └──enables───> Friction unlock (6.5)

Pairing (7.1)
    └──requires──> Parent auth (Firebase), Cloudflare Worker pair endpoints
    └──enables───> Remote rules (7.3), Parent dashboard (7.2),
                    Tamper alerts (7.6), More-time requests (7.4),
                    Family management (7.7)

Remote rules (7.3)
    └──requires──> Pairing (7.1), Limits / LimitEngine (6.3) [shared rule model]

Tamper alerts (7.6)
    └──requires──> Pairing (7.1), device heartbeat (WorkManager sync)

AI features (8.3: suggestions, intent check, coach, reports)
    └──requires──> Usage tracking (6.2) for data, Worker AI proxy (8.1)
    └──degrades-gracefully-without──> network / AI provider (hard requirement, not optional)

Gamification — streaks / ocean world (6.8)
    └──requires──> Limits / LimitEngine (6.3) [needs a daily "all limits respected" signal]

Doom-scroll nudges (8.3)
    └──requires──> Usage tracking (6.2) [on-device heuristic only — no AI dependency]

Strict/Lock mode ──conflicts──> Instant removal (product principle §3.1)
Device Admin / uninstall prevention ──conflicts──> Play Store non-stalkerware policy (§22)
Stealth child-monitoring ──conflicts──> Play Store monitoring-app policy (§22)
Granular in-app content blocking (canRetrieveWindowContent) ──conflicts──> minimal-disclosure Play-approval priority (deferred to v1.x, §29.5)
```

### Dependency Notes

- **Usage tracking requires App discovery:** you can't attribute foreground time to a package you haven't enumerated. Both must land before any limit type is meaningful (already Phase 1 in the roadmap).
- **AI smart suggestions require Usage tracking with real history:** the spec calls for 7–28 days of aggregates (§8.3); shipping AI before usage data has accumulated produces low-quality suggestions — sequence AI onboarding prompts accordingly (spec already does this: "if usage history exists... offer AI smart suggestions").
- **Tamper alerts require Pairing + heartbeat, not Device Admin:** this is the load-bearing substitution for the excluded anti-feature — if heartbeat reliability is weak, the entire child-safety story weakens with it. Treat heartbeat delivery as a Tier-1 reliability requirement, not a background nicety.
- **Doom-scroll nudges do NOT require the AI backend:** the on-device heuristic (continuous session length, app-switch frequency, late-night use) works standalone; AI only phrases the message. This is a genuine resilience win — don't accidentally couple it to the AI proxy's uptime.
- **Strict Mode conflicts with Instant removal:** these are mutually exclusive by construction (a block that can't be canceled early is incompatible with "removing a limit restores the app instantly"). This is already resolved by decision, not left open.
- **Granular content blocking conflicts with the Play-approval priority:** `canRetrieveWindowContent=true` requires a materially stronger accessibility disclosure and raises review risk — this is why it's correctly deferred to v1.x rather than bundled into the v1.0 accessibility declaration.

---

## Spec §6–§8 Feature Classification

Direct mapping of the planned feature list (`docs/PRODUCT_SPEC.md` §6–§8) onto the categories above, so requirements definition can weight effort correctly.

| Spec ref | Feature | Category | Complexity |
|---|---|---|---|
| §6.1 | App discovery (list, search, sort, filter) | Table stakes | LOW |
| §6.2 | Usage tracking (events-based, ±2 min accuracy) | Table stakes | MEDIUM |
| §6.3 | Daily/group/schedule/session/open-count limits | Table stakes (limit types exist elsewhere); the **combination + instant-apply engine** is where craft matters | MEDIUM-HIGH |
| §6.3 | Instant removal (block closes ≤1s) | Differentiator (explicit anti-Strict-Mode positioning) vs. table stakes elsewhere | LOW-MEDIUM (mostly an architectural discipline, not new UI) |
| §6.4 | Native full-screen block screen | Table stakes | MEDIUM |
| §6.5 | Friction unlock (breathing/typed phrase/wait) | Differentiator (most competitors gate this behind Strict Mode's opposite — pure delay, e.g. ScreenZen/one sec — ours frames it as a positive ritual, not a punishment) | MEDIUM |
| §6.6 | Focus mode | Table stakes | MEDIUM |
| §6.7 | Insights (today/week/month, heatmap) | Table stakes | MEDIUM |
| §6.8 | Gamification (streaks, ocean world, badges) | Differentiator (the ocean-world visual metaphor; streaks/badges alone are table stakes-adjacent, e.g. Opal) | MEDIUM |
| §6.9 | Notifications (warnings, summaries) | Table stakes | LOW |
| §6.10 | Widgets | Table stakes | LOW-MEDIUM |
| §6.11 | Settings (export, delete data, etc.) | Table stakes | LOW |
| §6.12 | Permissions health / watchdog | Table stakes **for Android specifically** (the category's biggest reliability complaint is OEM-killed services) — arguably a differentiator if executed well, since most competitors handle this poorly | MEDIUM |
| §7.1 | Pairing (QR/code) | Table stakes (parental category) | MEDIUM |
| §7.2 | Parent dashboard | Table stakes | MEDIUM |
| §7.3 | Remote rules | Table stakes | MEDIUM-HIGH |
| §7.4 | More-time requests (approve/deny) | Differentiator-leaning table stakes — present in some competitors but often clunky; a fast, well-designed approval flow is a real UX edge | LOW-MEDIUM |
| §7.5 | Child read-only experience + PIN lock | Table stakes (child protection expected by any parental app) | LOW-MEDIUM |
| §7.6 | Tamper alerts (no Device Admin) | Differentiator **and** the anti-feature substitution — this is the feature that has to work for the "no Device Admin" decision to be trustworthy | MEDIUM-HIGH |
| §7.7 | Family management (multi-child, co-parent) | Table stakes | MEDIUM |
| §8.1–8.2 | AI provider strategy, privacy contract | Differentiator (privacy-forward AI is not the category norm — Qustodio/Bark are data-hungry by design) | MEDIUM (mostly backend/Worker work) |
| §8.3 | Smart limit suggestions | Differentiator | MEDIUM |
| §8.3 | Intent check | Differentiator | MEDIUM |
| §8.3 | Doom-scroll nudge | Differentiator | LOW-MEDIUM (on-device heuristic) |
| §8.3 | Coach chat | Differentiator | MEDIUM-HIGH (streaming, schema-validated outputs) |
| §8.3 | Weekly report (self + parent) | Differentiator | MEDIUM |

---

## MVP Definition

### Launch With (v1.0 Android)

Everything already scoped as v1.0 in PROJECT.md/spec §4 is genuinely load-bearing for the core value ("set a limit and it's reliably enforced, remove it and it's instantly usable"):

- [ ] App discovery, usage tracking, all five limit types, instant add/edit/remove — the enforcement core is the entire value proposition; nothing else matters if this is unreliable
- [ ] Native block screen + friction unlock — the moment users judge whether the product "works"
- [ ] Focus mode — cheap to build on top of the same engine, high perceived value
- [ ] Onboarding with Play-compliant accessibility disclosure + OEM guides — this is what determines whether the app survives Play review *and* survives OEM battery killers, the two biggest existential risks per the research
- [ ] Insights (today/week/month) — table stakes, users check this immediately after setting a limit
- [ ] Notifications + widgets — low-cost table stakes
- [ ] Basic gamification (streaks, ocean world MVP, badges) — differentiator, but low-complexity relative to the enforcement core
- [ ] Parental pairing, remote rules, dashboard, more-time requests, tamper alerts — the entire parental-mode value proposition; a partial parental mode is worse than none (see Qustodio/OurPact complaints about half-working sync)
- [ ] AI: smart suggestions, intent check, doom-scroll nudges, coach chat, weekly report, all free-tier — the headline differentiator; must ship with visible quota and graceful degradation from day one, not bolted on later
- [ ] EN + UR with RTL, light/dark/system themes

### Add After Validation (v1.x)

- [ ] Website/URL limits — trigger: once `canRetrieveWindowContent` disclosure risk is validated against real Play review outcomes from v1.0
- [ ] Predictive nudges, adaptive limits — trigger: once enough usage-history volume exists to make pattern detection reliable
- [ ] Accountability partner — trigger: if retention data shows social/accountability features move D30 retention (currently unvalidated)
- [ ] Additional languages beyond EN/UR — trigger: demand signal from install geography
- [ ] Widget variants, tablet layout polish — trigger: usage data shows meaningful tablet install base

### Future Consideration (v2+)

- [ ] iOS (Screen Time API) — deferred: needs Mac/EAS + Apple Family Controls entitlement (weeks of lead time), and Android must prove the model first
- [ ] Monetization/entitlements activation — deferred: model undecided (spec §26); shipping free-and-complete first avoids the "crippled free tier" backlash seen across the category
- [ ] Desktop/browser blocking parity (à la Freedom/one sec) — deferred: real differentiator eventually, but out of scope for an Android-first phone product and would dilute focus on the harder Android reliability problem

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| LimitEngine (all rule types, instant apply/remove) | HIGH | HIGH | P1 |
| Native block screen + friction unlock | HIGH | MEDIUM | P1 |
| Usage tracking (accurate, ±2 min) | HIGH | MEDIUM | P1 |
| Onboarding + accessibility disclosure + OEM guides | HIGH | MEDIUM-HIGH | P1 |
| Permissions health watchdog | HIGH | MEDIUM | P1 |
| Parental pairing + remote rules + tamper alerts | HIGH | HIGH | P1 |
| Insights dashboard | MEDIUM | MEDIUM | P1 |
| Focus mode | MEDIUM | LOW-MEDIUM | P1 |
| AI smart suggestions + intent check | HIGH (differentiator) | MEDIUM | P1 |
| Coach chat | MEDIUM-HIGH (differentiator) | MEDIUM-HIGH | P1 |
| Gamification (streaks, ocean world) | MEDIUM (differentiator, delight) | MEDIUM | P1 |
| Widgets | MEDIUM | LOW-MEDIUM | P2 |
| Weekly AI report | MEDIUM | MEDIUM | P2 |
| Doom-scroll nudges | MEDIUM | LOW-MEDIUM | P2 |
| Website/URL limits | MEDIUM | HIGH (disclosure + reliability risk) | P3 (v1.x) |
| Predictive nudges / adaptive limits | LOW-MEDIUM (unvalidated) | MEDIUM-HIGH | P3 (v1.x) |
| Accountability partner | LOW-MEDIUM (unvalidated) | MEDIUM | P3 (v1.x) |
| iOS port | HIGH (market expansion) | HIGH | P3 (v2.0) |

---

## Competitor Feature Analysis

| Dimension | Google Digital Wellbeing / Family Link | Self-blockers (Opal, Freedom, one sec, ScreenZen, AppBlock, StayFree) | Parental suites (Qustodio, Bark, OurPact) | Our Approach |
|---|---|---|---|---|
| Self-mode limits | Yes, OS-level, free, but "hidden and easy to ignore" per the product's own vision framing | Core focus; feature-complete but fragmented across many single-purpose apps | Minimal/absent — these are parent-facing tools | Full limit-type set (§6.3) in one app, positioned as delightful rather than hidden |
| Parental mode | Family Link, free, Google-account-based | Absent | Core focus; deep (location, content, calls) | Present but deliberately scoped to usage/limits only — no content/location |
| Anti-bypass strictness | None (OS settings can be changed) | Ranges from none (one sec, easy to disable) to aggressive lock modes (Opal Deep Focus, Freedom Locked Mode, AppBlock Strict Mode) — the aggressive end draws both the best adherence claims and the worst reviews when it misfires | Marketed as "tamper-proof," which backfires publicly when bypassed (Bark) | Deliberately mid: friction unlock + tamper alerts, no lock mode, no Device Admin — trades peak adherence claims for trustworthiness and Play-review safety |
| AI / coaching | None | None in the blockers researched; separate niche apps exist (Dr. Screentime) but aren't also blockers | None | Free-tier AI woven directly into enforcement data (suggestions, intent check, coach, reports) — no direct competitor combines this with a full blocker+parental suite |
| Design/UX signature | Utilitarian, OS-settings-style | Opal is the most polished (gamified gems/leaderboard) but iOS/Mac-only and its best mode is paywalled; others are functional at best | Dashboard-oriented, functional, not delightful | "Liquid Time" wave motion language across the whole app, both modes |
| Pricing model | Free | Mixed: ScreenZen fully free (tips only); AppBlock/Opal/Freedom subscription-gate their best features ($20–$100/yr) | Subscription (Qustodio/Bark/OurPact all $5–15/mo range) | Free core at launch; monetization model undecided, `entitlements` seam reserved (spec §26) |
| Android robustness | Native, so reliable by definition | Mixed — StayFree rated 2.4/5 partly on reliability; Opal explicitly weaker on Android than iOS | Mixed — OurPact reliability complaints are the most frequent negative theme | Native accessibility + UsageStatsManager, OEM-specific guides, watchdog — the researched gap this product is best positioned to close |
| Localization | English-first, broad OS localization | English-first across all six | English-first across all three | Urdu + RTL as a launch pillar, one-file-per-language architecture |

---

## Sources

- [Digital Wellbeing - Apps on Google Play](https://play.google.com/store/apps/details?id=com.google.android.apps.wellbeing)
- [Manage how you spend time on your Android phone with Digital Wellbeing - Android Help](https://support.google.com/android/answer/9346420?hl=en)
- [Use Screen Time to manage your child's iPhone or iPad - Apple Support](https://support.apple.com/en-us/108806)
- [Apple Screen Time Review 2026 - Impulsec](https://impulsec.com/parental-control-software/apple-screen-time-review/)
- [Opal App Review 2026 - Autonomous](https://www.autonomous.ai/ourblog/opal-app-review)
- [Opal Reviews (2026) - JustUseApp](https://justuseapp.com/en/app/1497465230/opal-screen-time-control/reviews)
- [Opal app review: is it worth $100/year — Blok](https://www.blok.so/resources/opal-app-review-is-it-worth-100-year-for-screen-time-management)
- [one sec | app blocker, focus - Google Play](https://play.google.com/store/apps/details?id=wtf.riedel.onesec&hl=en)
- [one sec Reviews (2026) - Product Hunt](https://www.producthunt.com/products/one-sec-3/reviews)
- [One sec app review — Blok](https://www.blok.so/resources/one-sec-app-review-does-adding-friction-actually-reduce-screen-time)
- [ScreenZen App Review - WhistleOut](https://www.whistleout.com/CellPhones/Apps/screenzen-app-review)
- [ScreenZen Review 2026 - unhookd](https://unhookd.app/blog/screenzen-worth-it-review)
- [App Blocker- Block Apps - Google Play](https://play.google.com/store/apps/details?id=org.atmana.appblocker&hl=en)
- [AppBlock Review - Educational App Store](https://www.educationalappstore.com/app/appblock)
- [StayFree - Screen Time - Google Play](https://play.google.com/store/apps/details?id=com.burockgames.timeclocker&hl=en_US)
- [StayFree Reviews (2026) - JustUseApp](https://justuseapp.com/en/app/1631132311/stayfree-block-apps-sites/reviews)
- [Freedom: Internet, App and Website Blocker](https://freedom.to/)
- [Freedom app review — Blok](https://www.blok.so/resources/freedom-app-review-does-blocking-websites-and-apps-actually-work)
- [Qustodio Review 2026 - CyberNews](https://cybernews.com/best-parental-control-apps/qustodio-review/)
- [Qustodio Review 2026 - SafetyDetectives](https://www.safetydetectives.com/best-parental-control/qustodio/)
- [Bark Parental Controls Reviews - Trustpilot](https://www.trustpilot.com/review/bark.us)
- [Bark Review 2026 - allaboutcookies](https://allaboutcookies.org/bark-review)
- [OurPact Reviews - Trustpilot](https://www.trustpilot.com/review/ourpact.com)
- [OurPact Review 2026 - NexSpy](https://nexspy.com/blog/ourpact-review)
- [How Kids Bypass iPhone Parental Controls - AirDroid](https://www.airdroid.com/ios-parental/how-kids-bypass-iphone-parental-controls/)
- [How Kids Try to Bypass Google Family Link - Bitdefender](https://www.bitdefender.com/en-us/blog/hotforsecurity/family-link-bypass-android-2025)
- [Screentime AI Coach App - App Store](https://apps.apple.com/us/app/screentime-ai-coach/id6741393702)
- [Habit Coach AI - Google Play](https://play.google.com/store/apps/details?id=ai.habitcoach.app&hl=en)
- [Developer Program Policy: stalkerware and monitoring apps - Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/10065487?hl=en)
- [Google Bans User Tracking and Stalkerware Apps From Play Store - CPO Magazine](https://www.cpomagazine.com/data-privacy/google-bans-user-tracking-and-stalkerware-apps-from-play-store/)
- Internal: `docs/PRODUCT_SPEC.md` §3–§8, §22 (Google Play compliance), §29 (open questions) — treated as HIGH confidence (first-party project source)
- Internal: `.planning/PROJECT.md` — Core Value, Constraints, Key Decisions — treated as HIGH confidence (first-party project source)

---
*Feature research for: Android screen-time limiter / app blocker with self + parental modes and AI coaching*
*Researched: 2026-09-25*
