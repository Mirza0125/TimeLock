# Pitfalls Research

**Domain:** Android-first screen-time limiter / app blocker / parental-control app (React Native + Expo, native Kotlin enforcement, Firebase + Cloudflare Worker backend, free-tier LLM AI)
**Researched:** 2026-09-25
**Confidence:** MEDIUM (Google Play policy, OEM behavior and free-tier quota figures cross-checked across official docs — support.google.com, developer.android.com — and multiple independent 2026 sources via web search; these are exactly the kind of facts that drift month to month, so re-verify anything release-blocking directly against Play Console Help immediately before Phase 7 execution, not from this document alone)

This app sits at the intersection of the two Google Play categories with the highest historical rejection/removal rates: **AccessibilityService abuse** and **stalkerware/monitoring apps**. Almost every critical pitfall below traces back to one root cause: features that are technically necessary (foreground-app detection, remote parental control) are also the exact signature Play's automated + human review teams scan for. The project's own `PRODUCT_SPEC.md` already encodes a lot of hard-won awareness of this (§3, §13.2, §22, §28) — this document exists to stress-test that plan against what actually goes wrong in production, sharpen the parts that are already stale (the target-API deadline referenced in the spec has already passed as of this research date), and surface bypass/perf/i18n/quota traps the spec doesn't fully cover.

---

## Critical Pitfalls

### Pitfall 1: isAccessibilityTool / prominent-disclosure misdeclaration

**What goes wrong:**
Developers either (a) set `isAccessibilityTool="true"` to try to skip the prominent-disclosure flow, or (b) declare it correctly as `false` but ship a disclosure screen that doesn't meet Play's exact bar (no explicit "I agree" affirmative action, disclosure text buried, or the disclosure appears *after* the OS permission dialog instead of before). Either mistake is a top-cited cause of Play rejection and repeat rejection cycles for this app category.

**Why it happens:**
`isAccessibilityTool=true` looks like a shortcut — it exempts the app from the disclosure/consent/video requirement. But that flag is legally/contractually reserved for apps whose *primary purpose* is helping users with disabilities. A screen-time limiter is not that, so declaring it true is a false declaration Google actively audits for, and it triggers takedown, not just rejection.

**How to avoid:**
Keep `isAccessibilityTool="false"` (as the spec already decides) and build the disclosure screen to Play's exact recipe: in-app screen, plain language, states what is accessed ("which app is currently on screen"), why, what is never accessed (content, keystrokes, messages), and a distinct affirmative "I agree"/"I understand" tap — *before* the deep link to system Accessibility settings, not after. Record the unlisted YouTube demo video with slow, readable scrolling through the full disclosure text, then the enable flow, then a real block event, exactly as Play's reviewer guidance specifies.

**Warning signs:**
- Any team discussion of "just set isAccessibilityTool to true, it's simpler."
- Disclosure copy that changes without updating the demo video (video drifts out of sync with the shipped screen).
- Demo video that skips/fast-scrolls through the disclosure text.

**Phase to address:**
Phase 3 (Self-mode features / onboarding + permissions) for the screen build; Phase 7 (Hardening & release) for the Play Console declaration + video, re-validated any time onboarding copy changes.

---

### Pitfall 2: IsMonitoringTool flag omitted on non-production tracks, or monitoring-app policy violated by copy/behavior

**What goes wrong:**
The `IsMonitoringTool`/stalkerware-policy metadata flag is set correctly on the production track's manifest but forgotten on internal/closed-testing tracks (different build variant, different manifest merge), or store-listing/onboarding copy accidentally uses language that reads as "track your kid secretly" instead of "manage your family's screen time openly." Either causes a monitoring-app policy flag, which is judged more harshly than an ordinary policy violation.

**Why it happens:**
The flag must be present on **every version code across every track**, not just production — an easy thing to miss when closed testing is rushed before the 14-day clock even starts. Marketing/ASO copy is often written by a different pass than the compliance review, so "see everything on your child's phone" language can slip into a listing draft that never gets compliance eyes.

**How to avoid:**
Wire the `IsMonitoringTool` (parental_control) metadata through the same Expo config plugin used for the accessibility service declaration, so it's generated identically for every build variant/track — never hand-added per-track. Keep the persistent, non-dismissable "managed by \<Family\>" notification and visible app icon exactly as PRODUCT_SPEC §5.4/§7.6 already specifies (never stealth/hidden — this is explicitly Out of Scope, correctly). Run every piece of store-listing and in-app copy that mentions the parental feature past a compliance checklist before publishing: no "secret," "hidden," "spy," "without them knowing."

**Warning signs:**
- Internal/closed test track manifest diff shows the flag present on production but absent/different on other tracks.
- Any onboarding, ASO, or support copy drafted independently of the compliance-reviewed disclosure language.

**Phase to address:**
Phase 5 (Cloud & parental) for wiring the flag into every build config; Phase 7 for the full-track audit before submission.

---

### Pitfall 3: Families policy / target-audience misdeclaration because the app literally has a child-operated mode

**What goes wrong:**
The team declares target audience as "18+ / adults and parents" (correct, per PRODUCT_SPEC §22) but Play's automated content classifiers or human reviewers flag the app for Families policy review anyway, because Child mode (§5.4, §7.5) is a mode children directly operate on their own device — a signal Play's classifier associates with "app is used by children" regardless of the stated audience.

**Why it happens:**
Target-audience declaration in Play Console is about who the app is *marketed to and designed for*, but review also considers *who actually uses the app on-device*. A "parent sets it up, child uses it daily" product is a genuine gray area that trips up nearly every parental-control app at least once.

**How to avoid:**
Be explicit and consistent everywhere Play looks: store listing states the app is for parents/adults who manage family devices, not "for kids"; content rating questionnaire answered accordingly; Child mode screens have no ads, no data collection beyond what's declared, and no COPPA-relevant identifiers leaving the child device (already the plan per §7). Add one Play Console "App access" reviewer note explicitly addressing this: "Child mode is configured exclusively by an authenticated parent account; it is not marketed to or downloaded independently by children."

**Warning signs:**
- Store listing screenshots or copy showing the child-mode UI without parent-mode context around it.
- No explicit reviewer note addressing the child-operated-mode nuance.

**Phase to address:**
Phase 7 (Hardening & release) — target audience/content rating/reviewer notes are a release-gate task, but the underlying data-minimization design (no ads, no extra child data) must already be true from Phase 5.

---

### Pitfall 4: Target API level compliance drift — the spec's own assumption is already out of date

**What goes wrong:**
PRODUCT_SPEC §13.1 says "API 35 required since Aug 2025; plan for API 36." As of this research date (2026-09-25), that deadline has already passed: **new app submissions and updates have required targeting Android 16 (API 36) since August 31, 2026** (with a possible extension to Nov 1, 2026 for teams that request it), and *existing* published apps needed to reach API 35 by the same Aug 31, 2026 date. A roadmap that treats "API 36" as a future planning item rather than the current mandatory floor will fail submission on day one of Phase 7.

**Why it happens:**
Play's target-API deadline moves every year (new deadline announced ~12 months ahead, enforced every August), and specs/roadmaps written months earlier quietly go stale. Nobody re-checks the number at execution time because "we already researched this."

**How to avoid:**
Treat target/compile SDK as a value to *re-fetch from Play Console Help at the start of Phase 7*, not a constant carried from planning docs. Build against the latest stable Expo SDK's bundled Android target (Expo SDKs typically track the newest Android release within weeks), and add a CI check or release-checklist line item: "confirm current Play target API requirement before every production submission," not just once.

**Warning signs:**
- Any PLAN.md or release checklist that hardcodes a specific API level as a fact rather than "whatever Play requires at submission time."
- Gradle `targetSdkVersion` pinned to a literal number without a comment linking to the policy page.

**Phase to address:**
Phase 0 (toolchain setup — pick current compileSdk) and Phase 7 (release — re-verify before every submission and every subsequent yearly release).

---

### Pitfall 5: 12-testers/14-days closed-testing clock resets, and personal-vs-organization account confusion

**What goes wrong:**
The team starts closed testing with exactly 12 testers, one drops out (uninstalls, opts out, phone breaks) on day 9, and Google's system resets the continuous-opt-in clock to zero — the team doesn't notice until they try to apply for production access and get rejected. Separately, the team assumes an "organization" Play account still needs 12 testers, when in fact organization accounts verified with a D-U-N-S number are exempt entirely — or they assume a personal account is exempt when it isn't (only accounts created *before* Nov 13, 2023 are grandfathered).

**Why it happens:**
The requirement isn't "12 sign-ups ever," it's "12 accounts continuously opted-in for the same rolling 14-day window," and Google doesn't proactively warn about drop-outs — the counter just silently resets. D-U-N-S verification (needed for the organization-account exemption) takes 2–4+ weeks, which is easy to underestimate if discovered late.

**How to avoid:**
Recruit 15–18 testers, not exactly 12, to survive natural drop-out. Track opt-in status weekly in a spreadsheet/dashboard, not just at day 14. Decide the account type (personal vs. organization) explicitly and early — PRODUCT_SPEC §29 already flags this as an open question; resolve it in Phase 0/setup, not Phase 7, because a D-U-N-S application started late can single-handedly delay launch by a month.

**Warning signs:**
- Fewer than ~15 testers recruited going into the 14-day window.
- No weekly check of the Play Console testing-status dashboard.
- Account-type decision still "TBD" heading into Phase 7.

**Phase to address:**
Phase 0 (decide account type) and Phase 7 (execute + monitor the testing window with buffer testers).

---

### Pitfall 6: OEM background killing silently disables the accessibility service with no error the user notices

**What goes wrong:**
On Xiaomi (MIUI/HyperOS), Samsung (One UI "sleeping apps"), Oppo/Realme/OnePlus (ColorOS/OxygenOS background freeze), and Vivo (background power restriction), the OS force-kills the app's process under memory/battery pressure. When that happens, the bound accessibility service is torn down — sometimes it does *not* auto-restart, or (on MIUI specifically) re-enabling it requires the user to sit through a mandatory 10-second warning dialog every single time. From the user's point of view, the app "just stops blocking anything" days after it worked fine in testing, with zero on-screen indication anything changed.

**Why it happens:**
Chinese-OEM (and increasingly Samsung) battery managers implement far more aggressive process/reclamation policies than stock Android/Pixel, specifically targeting exactly the pattern this app needs (long-lived background service + accessibility service). This is a well-documented, industry-wide problem (see dontkillmyapp.com) that stock-Android emulator testing (this project's primary dev target, `Medium_Phone_API_36.1`) will never surface.

**How to avoid:**
Exactly as PRODUCT_SPEC §19.2 plans: per-OEM onboarding guides with deep links to autostart/battery whitelist screens (built from dontkillmyapp.com's manufacturer catalog), plus the `WatchdogWorker` (§13.3, §6.12) that polls every 15 min whether the accessibility service is actually bound and pushes a "Protection paused — tap to fix" notification when it isn't. Critically: **do not treat the Phase-0/Phase-1 emulator-passing state as evidence this works** — this pitfall is invisible until tested on real Xiaomi/Samsung/Oppo/Vivo hardware (Firebase Test Lab + real closed-testing devices per PRODUCT_SPEC §20), which the project correctly schedules but must not defer past Phase 7 "for real" — do a lightweight OEM smoke pass as early as Phase 1, not only at hardening.

**Warning signs:**
- All internal testing happens exclusively on the AVD emulator or a single Pixel/stock device.
- No watchdog notification firing in a controlled kill-and-wait test on a Xiaomi/Samsung device before Phase 7.
- Crash-free/enforcement metrics look perfect in development but closed-testing feedback mentions "it stopped working after a day."

**Phase to address:**
Phase 1 (build the watchdog + OEM helper scaffolding) with an early real-device smoke test; Phase 7 (full OEM matrix validation via Firebase Test Lab + closed testers on mixed OEMs, as §20 already plans).

---

### Pitfall 7: Android 13+ "Restricted settings" blocks testers/QA from ever enabling the accessibility service on sideloaded builds

**What goes wrong:**
QA engineers, closed-testing recruits helping debug, or the team itself install a debug/internal APK directly (not through Play), then can't figure out why the Accessibility toggle is greyed out with "For your security, this setting is currently unavailable" — and either give up, file a false bug report, or waste review time.

**Why it happens:**
Android 13+ "Restricted settings" specifically blocks apps installed via session-based sideloading (direct APK transfer, most non-Play installers) from having their Accessibility/Device-Admin toggle enabled by default. Play Store installs are exempt, so this bug never appears once the app is live in production or in the Play-distributed closed/internal test track — but it *will* appear for any ad-hoc APK shared for debugging.

**How to avoid:**
Distribute all pre-release builds through Play's internal testing track (which is exempt) rather than raw APK sharing wherever possible. For the cases where a raw APK is unavoidable, bake the workaround into the onboarding permission screen itself exactly as PRODUCT_SPEC §5.2 step 2 already plans ("Android 13+ 'Allow restricted settings' guide when the app was sideloaded") — detect the condition (toggle exists but throws/greys out) and show "Settings → App info → ⋮ → Allow restricted settings" inline, not just as generic help-center text.

**Warning signs:**
- Internal bug reports of "accessibility toggle won't turn on" that don't reproduce for the reporter after reinstalling from Play.
- Onboarding step 2 guide written generically instead of actually detecting the restricted-settings state.

**Phase to address:**
Phase 3 (onboarding/permissions build) for the in-app detection + guide; Phase 0/1 process note to always distribute test builds via Play internal track.

---

### Pitfall 8: Background Activity Launch (BAL) restrictions tighten every Android release and can silently break `BlockActivity`

**What goes wrong:**
The core enforcement mechanism — a bound `AccessibilityService` launching a full-screen `BlockActivity` from the background — relies on a BAL exemption Android has historically granted to bound accessibility services. Android 14 already changed the default so a service *bound by another app* needs `Context.BIND_ALLOW_ACTIVITY_STARTS` to retain that privilege; Android 15 removed implicit BAL grants for `PendingIntent`s by default; Android 16 continues tightening this surface. If a future OS update (or an Android beta the team hasn't tested against) closes the specific exemption this app relies on, the block screen simply fails to appear — silently, with the only symptom being "the app didn't block anything."

**Why it happens:**
Background-activity-launch restriction is one of the most actively hardened areas of Android security, revisited nearly every release, precisely because it's the mechanism malware/aggressive-ad SDKs abuse — the same mechanism a screen-time blocker legitimately needs.

**How to avoid:**
PRODUCT_SPEC §13.5 already schedules a Phase-0 spike validating this on Android 10/12/14/latest with `GLOBAL_ACTION_HOME` + heads-up-notification fallback — keep that fallback path production-ready (not just a spike artifact) and add it to the **yearly** re-validation cadence already flagged in §28's risk table ("Background activity launch restricted in future Android → yearly re-validation"). Treat every new Android beta/QPR release as a trigger to re-run the Phase-0 spike against the beta image before the stable release ships, not after.

**Warning signs:**
- The BAL spike is run once in Phase 0 and never repeated against subsequent Android beta releases.
- The `GLOBAL_ACTION_HOME` + notification fallback path exists in code but has no automated or scheduled manual test keeping it alive.

**Phase to address:**
Phase 0 (initial spike, already planned) with a recurring re-validation task attached to Phase 7 and to every future annual Android release cycle (post-launch maintenance, beyond phase 8).

---

### Pitfall 9: Free-tier LLM quota exhaustion is an org-wide shared pool, not "per user," and gets discovered in production, not testing

**What goes wrong:**
Groq's free tier is enforced **per account/organization, not per end-user** — roughly 30 requests/minute and (depending on model) 1,000–14,400 requests/day shared across every user of the app. A handful of active users chatting with the coach can exhaust the daily quota in hours; when that happens, *every* user's AI features go down simultaneously, not just the heavy user's. If this is only discovered after launch (because dev/testing traffic never got close to the ceiling), it looks like a production outage, not capacity planning.

**Why it happens:**
Free-tier LLM limits look generous when read in isolation ("1,000 requests/day sounds like plenty") but the assumption breaks the moment there's more than a handful of concurrent users, and the exact numbers are model-specific and change over time (verify at implementation time, as §8.1 itself already warns).

**How to avoid:**
Enforce the per-user daily caps PRODUCT_SPEC §8.1 already specifies (20 coach messages/day, 3 suggestion runs/day) **in the Worker**, independent of the upstream provider's limit, so no single user can starve everyone else. Add a *global* circuit breaker in the Worker that tracks aggregate provider usage and pre-emptively serves "AI is busy, try again later" once approaching the org-wide ceiling, rather than waiting for 429s. Load-test the Worker against realistic concurrent-user projections before launch (Phase 6), not just functionally against one dev's API key.

**Warning signs:**
- Per-user quotas are implemented but no aggregate/global quota tracking exists in the Worker.
- Groq/Gemini API keys are tested only by 1–2 developers, never simulated at expected launch-day concurrency.

**Phase to address:**
Phase 6 (AI) — build the global quota tracker and failover alongside the per-user quotas; verify with a load test before Phase 7 release.

---

### Pitfall 10: Firebase Spark free-tier quota is per-project, not per-user, and naive per-device sync patterns burn through it fast

**What goes wrong:**
Firestore's Spark free tier gives roughly 50,000 reads and 20,000 writes **per day, per project** — shared across every family in the app, not per child. PRODUCT_SPEC §15.1 already budgets ≤60 writes/child/day and flags migrating to Blaze around ~250 active children, which is the right instinct — but it's easy to blow through that budget accidentally: e.g., leaving a Firestore `onSnapshot` real-time listener open per screen (parent dashboard, child detail, requests) multiplies read costs per session in ways that are invisible until a usage spike.

**Why it happens:**
Firestore's pricing model charges per document read/write, and real-time listeners re-fire on every field change from every device watching that document — a pattern that's "free" to write in code but not free to run, and doesn't show up as a bug until the daily quota is hit and every subsequent parental sync in the app starts failing for all users simultaneously (a shared-fate outage, same failure class as Pitfall 9).

**How to avoid:**
Keep to hourly rollups for usage/heartbeats (already planned), close/detach Firestore listeners aggressively when screens unmount, batch writes where possible, and add Crashlytics/Worker-side monitoring of daily Firestore read/write counts so the team sees the quota trend line *before* users hit a hard failure. Treat the ~250-active-children Blaze-migration trigger from §15.1 as a real alert threshold to instrument, not just a note in a spec.

**Warning signs:**
- No dashboard/alert tracking daily Firestore read/write counts against the Spark ceiling.
- Any screen holding an active `onSnapshot` listener with no corresponding cleanup on unmount.

**Phase to address:**
Phase 5 (Cloud & parental) for listener discipline and rollup design; Phase 7 for adding quota monitoring/alerting before production rollout.

---

### Pitfall 11: Expo prebuild + custom native module drift — hand-edited native files silently vanish

**What goes wrong:**
Under time pressure, a developer directly edits the generated `android/app/src/main/AndroidManifest.xml` or a Kotlin file inside `android/` to quickly test something, it works, gets forgotten — then the next `expo prebuild` (or a clean CI build, or an EAS Build) regenerates those directories from config plugins and silently discards the hand-edit. The bug reappears in CI/production with no obvious diff, because the source of truth (config plugin) was never updated.

**Why it happens:**
Expo's Continuous Native Generation model treats `android/` and `ios/` as build *outputs*, not source — this is by design, but it's counter-intuitive to anyone coming from a bare React Native or native Android background, and nothing prevents editing those files locally; the mistake is invisible until the next full regeneration.

**How to avoid:**
Route every native manifest/build.gradle/project change through a config plugin in `plugins/` (as PRODUCT_SPEC §12.1 already structures the repo), never edit `android/`/`ios/` directly once prebuild is in use. Run `expo prebuild --clean` regularly in local dev (not just in CI) so drift surfaces immediately instead of at release time. Keep config plugins synchronous and side-effect-free per Expo's contract, and be deliberate about plugin *order* in `app.json`/`app.config.ts` — plugins that patch the same file can conflict or overwrite each other depending on execution order, which is a common source of "works on my machine, fails in EAS Build" bugs.

**Warning signs:**
- Any `git diff` showing changes inside `android/` or `ios/` that aren't regenerated output.
- A bug that "fixes itself" after `expo prebuild --clean` or reappears after a clean CI build.
- Custom native code (accessibility service, block activity, Room, WorkManager — all central to this app per §13.3) added directly to generated folders instead of via `modules/screen-guard/android/` + a config plugin.

**Phase to address:**
Phase 0 (establish the CNG discipline and CI `prebuild --clean` step from day one) and Phase 1 (the native `ScreenGuard` module is the highest-risk surface for this mistake).

---

### Pitfall 12: Skia/Reanimated idle animation loops keep running (and draining battery/CPU) even when off-screen

**What goes wrong:**
The signature "Liquid Time" wave, `WaveRing`, `WaveBackground`, and especially the always-growing `OceanWorld` scene use continuous idle motion (gentle wave sway, ambient gradients). If these are implemented with certain Reanimated+Skia hook patterns (`useDerivedValue`/path-interpolation chains combined with a global `withRepeat(-1)`), the animation can keep re-triggering itself even on canvases that are logically unmounted or scrolled off-screen, pinning the UI thread at high frame times with zero user-visible benefit — directly undermining the app's own battery budget (<2%/day) and 60fps target.

**Why it happens:**
Skia bypasses the RN bridge and renders on the UI thread for good reason (performance), but that same directness means a single global infinite-repeat animation loop can be shared/kept alive across screens that no longer need it, and it won't show up in a quick visual QA pass — only in profiling or multi-hour battery testing.

**How to avoid:**
Explicitly pause/stop idle wave animations when their screen loses focus (Expo Router's navigation lifecycle) rather than relying on component unmount alone; cap simultaneously-animated Skia components (roughly ≤100 concurrent animated primitives is the practical ceiling for low-end Android, per community profiling of comparable apps). Respect Reduce Motion everywhere idle motion exists (already planned, §10.5) as a genuine performance lever, not just an accessibility nicety. Profile the Home screen (wave + tab bar + ocean world simultaneously animated) specifically, since that's where multiple animated components stack.

**Warning signs:**
- Battery/CPU profiler shows non-zero UI-thread activity while the app is backgrounded or a wave screen is off-screen.
- Frame times on a mid/low-end Android device climb only after navigating away from and back to the Home screen repeatedly (a sign of leaked/duplicated animation loops).

**Phase to address:**
Phase 2 (Design system & foundations) when the wave components are first built; re-verified in Phase 4 (gamification/ocean world adds more simultaneous animation) and Phase 7 (battery budget hardening).

---

## Moderate Pitfalls

### Pitfall 13: Chasing exact parity with Digital Wellbeing when Digital Wellbeing itself is a buggy reference

**What goes wrong:**
The ±2 minute accuracy acceptance criterion (§6.2) is reasonable, but Digital Wellbeing has its own well-documented accuracy bugs (real-world reports of DW showing more time for a single app than total phone-on-time that day). Engineering effort spent trying to exactly reproduce whatever number Digital Wellbeing shows is effort spent chasing a moving, sometimes-wrong target.

**How to avoid:**
Use `UsageStatsManager.queryEvents` (event-based) as the source of truth exactly as planned, not `queryUsageStats` (coarse buckets) — this alone gets closer to ground truth than DW itself often is. Treat the ±2 min AC as a sanity check against DW for gross-error detection, not a pixel-perfect target; document known edge cases (split-screen double-counting, PiP counted as active — both correctly decided as "counts" in §6.2 EC) as intentional product decisions, not bugs to reconcile against DW's behavior.

---

### Pitfall 14: Enforcement bypass surface (multi-user profiles, safe mode, guest mode) undersold in the product and support copy

**What goes wrong:**
PRODUCT_SPEC §17 already accepts several bypasses as documented limitations (safe mode = no enforcement, second/work profile = not enforced in v1). The risk isn't the technical decision — it's under-communicating it. A parent who doesn't know a child can create a second Android user profile (a stock OS feature requiring only an email address) or boot into Safe Mode to fully bypass every rule will file support tickets/1-star reviews describing it as "the app doesn't work" rather than "known limitation."

**How to avoid:**
Surface known bypass vectors proactively in the parent-facing settings/FAQ (not buried in a privacy policy), and have the tamper-alert system explicitly call out plausible bypass signals it *can* detect (missing heartbeat correlating with a profile switch or safe-mode boot, where technically observable) rather than staying silent. Consider a one-line onboarding disclosure to parents: "For safety and Play Store rules, this app can't prevent every possible workaround (e.g., Safe Mode, a second phone profile) — here's what it does catch."

---

### Pitfall 15: Urdu Nastaliq line-height and RTL mirroring shipped incomplete

**What goes wrong:**
Noto Nastaliq Urdu needs roughly 1.5–1.8× the line-height of the Latin typeface to avoid clipped/overlapping diacritics and descenders — a fixed line-height carried over from the English design tokens will visibly break Urdu text (already anticipated generically in §10.3's "line-height ≥ 1.8×" but easy to under-apply in practice across every screen, not just the ones tested). Separately, "RTL support" often gets implemented as text-alignment only, missing icon mirroring (back chevrons, wave direction, chart axis direction) and the required full-app-reload-on-direction-change UX (§11 already notes the reload requirement, but it's easy to forget to *tell the user* it's happening).

**How to avoid:**
Set Urdu line-height as a font-specific token (not a shared constant) applied everywhere Urdu text renders, verify with real Nastaliq text (not lorem ipsum) containing tall/deep diacritics. Build an RTL visual-QA checklist covering icon mirroring, chart/heatmap axis direction, and wave-flip direction, and test it as its own item every phase that touches UI — not just once in Phase 2. Show a brief "Restarting to apply language..." transition on direction switch rather than a silent reload.

---

### Pitfall 16: Full-screen-intent / heads-up-notification restrictions weaken the 80%/5-min warning UX on Android 14+

**What goes wrong:**
Android 14+ restricts full-screen-intent notification permission to calling/alarm-type apps by default; Play can revoke the permission for apps that don't fit that profile. If the "5 minutes left" warning was ever implemented (or later changed) to rely on a full-screen intent rather than a standard heads-up notification, it would silently degrade to a normal notification — easy to miss since §6.3 already correctly specifies a standard heads-up notification/toast, not a full-screen intent, but worth guarding against scope creep (e.g., "let's make the warning more prominent" later reintroducing this).

**How to avoid:**
Keep pre-limit warnings on standard notification channels (already the plan) and treat any future request to make warnings "more urgent" via full-screen intents as a Play-policy red flag requiring explicit justification (this app isn't a calling/alarm app and would likely have that permission revoked).

---

### Pitfall 17: Account-deletion and privacy-policy links rot between submission and review

**What goes wrong:**
Play Data Safety review specifically checks that the account-deletion web page and privacy-policy URL are live, accurate, and consistent with the in-app flow at the moment of review — not just at the moment they were written. A page hosted on a free static host (GitHub Pages/Cloudflare Pages, as §17/§24.1 plan) that gets renamed, moved, or left pointing at a stale domain causes an otherwise-clean submission to fail Data Safety review.

**How to avoid:**
Pin the privacy-policy/account-deletion URLs in CI as a smoke test (an automated check that hits both URLs and asserts 200 + expected content before each release), and re-verify both links as an explicit Phase 7 release-checklist item every release, not just the first one.

---

## Minor Pitfalls

### Pitfall 18: QUERY_ALL_PACKAGES / PACKAGE_USAGE_STATS declaration inconsistency across manifest, Play Console, and privacy policy

**What goes wrong:** The manifest correctly avoids `QUERY_ALL_PACKAGES` (using `<queries>` for MAIN/LAUNCHER only, per §13.2) and declares `PACKAGE_USAGE_STATS` with `tools:ignore`, but the Play Console permissions-declaration form or the privacy policy describes the usage-access justification slightly differently than what the manifest/UI actually does.

**Prevention:** Keep one canonical sentence describing usage-access justification, reused verbatim in the manifest comment, Play Console declaration, privacy policy, and onboarding disclosure copy, so a reviewer never sees drift between them.

### Pitfall 19: Wall-clock vs. elapsed-realtime confusion in session/limit timers

**What goes wrong:** Using `System.currentTimeMillis()` for session-limit or friction-unlock countdowns instead of `SystemClock.elapsedRealtime()` lets a user (or an accidental timezone/DST change) trivially reset a session timer by changing the clock.

**Prevention:** §13.4 already specifies `elapsedRealtime` for session timers and `ACTION_TIME_CHANGED` detection for wall-clock jumps — enforce this with a lint rule or code-review checklist item banning raw `currentTimeMillis()` in any timer/countdown code path in the native module.

### Pitfall 20: Reviewer test-account/demo-video requirements underestimated at submission time

**What goes wrong:** The team submits without a persistently-working Parent test account + child pairing flow the reviewer can actually complete end-to-end, or the accessibility demo video is recorded once early in development and drifts out of sync with the shipped disclosure copy.

**Prevention:** Re-record the accessibility demo video as a release-checklist item whenever onboarding/disclosure copy changes, and maintain one long-lived, non-expiring Parent+Child demo account pair specifically for Play reviewers (not a real test user account that might get cleaned up).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-----------------|
| Use `queryUsageStats` (coarse buckets) instead of `queryEvents` for usage tracking | Much simpler to implement | Fails the ±2 min accuracy AC; can't compute accurate opens/session boundaries | Never for shipped code — only for a throwaway Phase-0 spike |
| Hand-edit `android/AndroidManifest.xml` directly instead of a config plugin | Fast local iteration | Silently reverted by next `prebuild`/EAS build; bug reappears in CI with no diff | Only inside a scratch/local-only branch never merged, and only for a few minutes of exploration |
| Set `isAccessibilityTool=true` to skip building the disclosure screen | Skips real UI/compliance work | Play rejection or takedown for false declaration | Never |
| Add `SYSTEM_ALERT_WINDOW` overlay "just in case" the activity-launch approach has edge cases | Simplifies block-screen guarantee | Extra sensitive-permission surface, more Play scrutiny, contradicts the app's own minimal-permissions principle (§3.3) | Only if the Phase-0 BAL spike conclusively proves activity-launch + `GLOBAL_ACTION_HOME` fallback is insufficient, and only with an explicit justification recorded |
| Hardcode Groq/Gemini model IDs and call them directly from the RN app for MVP speed | Ships AI features faster in Phase 6 | Leaks provider choice/rate-limit exposure into the client; can't swap failover logic without an app update; risks leaking API keys | Never — the Worker-proxy design (§8.1, §15.2) must hold from the first AI commit |
| Test only on the AVD emulator, defer all OEM device testing to Phase 7 | Faster inner dev loop | OEM-kill/accessibility-disable bugs (Pitfall 6) surface for the first time during closed testing or worse, post-launch | Acceptable for Phase 0–2 UI work; not acceptable once the native enforcement core (Phase 1) is functional — do a lightweight OEM smoke pass then |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Google Play Console (multi-track) | `IsMonitoringTool`/accessibility declarations set on production only, forgotten on internal/closed tracks | Generate all compliance metadata from one config-plugin/build-config source used identically by every track |
| Firebase Auth (custom tokens for child devices) | Minting custom tokens client-side or with long/no expiry | Mint only in the Cloudflare Worker using the Firebase Admin service account, short-lived, scoped to one device principal |
| Cloudflare Worker + Firebase | Assuming the Firebase Admin Node SDK runs unmodified in the Workers runtime | Use a Workers-compatible approach (manual JWT signing / REST calls to Firebase Identity Toolkit and Firestore REST/gRPC-Web, or a Workers-targeted Firebase library) — verify compatibility before building on it |
| FCM push from the Worker | Using the deprecated legacy FCM server-key API | Use FCM HTTP v1 with an OAuth2 access token derived from the service account, exactly as §15.2 already plans |
| Groq primary / Gemini fallback (OpenAI-compatible proxy) | Assuming identical response/streaming schemas between providers, so failover silently breaks output parsing or SSE streaming | Normalize both providers' responses to one internal schema in the Worker before returning to the client; test the failover path explicitly, not just the happy path |
| Play Billing (future monetization) | Deferring the `entitlements` seam until monetization is decided, then retrofitting gating logic across the whole app | Keep the entitlements check as a no-op-but-present seam from Phase 1 onward (already the plan per PROJECT.md), so turning on billing later touches one module, not every feature screen |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Always-running idle Skia/Reanimated wave loops (Home + tab bar + ocean world simultaneously) | Dropped frames, elevated background battery drain | Pause idle animations on blur/background; respect Reduce Motion; cap concurrent animated primitives (~100 on low-end Android) | Breaks first on low-end/older Android devices once ≥2 animated wave surfaces are visible/alive at once (e.g., Home tab + persistent tab-bar wave) |
| Unfiltered accessibility event stream (all event types, all packages) | Elevated battery drain not attributable to any single obvious cause in profiler | Restrict `accessibilityEventTypes` to `typeWindowStateChanged\|typeWindowsChanged` (already planned §13.2) and filter by package in code, never retrieve window content | Breaks on heavy multitaskers who switch apps very frequently — event volume scales with switching rate, not screen time |
| Open Firestore `onSnapshot` real-time listeners left attached across parent-app screens | Firestore read quota consumed far faster than the per-child write budget models | Detach listeners on screen blur/unmount; prefer one-shot reads + WorkManager-driven periodic sync where real-time isn't essential | Breaks once a family has multiple children and the parent leaves the dashboard open/backgrounded with listeners still attached |
| 1s foreground tick persisted to Room without batching | Room write contention / excess I/O wakeups on rapid app-switching | Batch/coalesce writes (already planned: persist every 15s and on switch, not every tick) | Breaks on power users who switch between limited apps very rapidly (many switches/minute) |
| Groq/Gemini calls made directly per keystroke or per screen-focus event in the coach chat UI | Org-wide quota (Pitfall 9) exhausted disproportionately by UI chattiness, not real usage | Debounce/only call on explicit user send action; cache intent-check "chip" responses locally before calling AI for personalization only | Breaks as soon as concurrent active users exceeds roughly a handful, given Groq's shared per-org daily caps |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-reported heartbeat/tamper fields without any independent signal | A modified/rooted child client could report "protection: on" while actually disabled, defeating tamper alerts | Cross-check heartbeat claims against server-observable signals (missing heartbeat, FCM delivery failures, app-version anomalies); treat client-reported "all good" as advisory, not authoritative — this is already partially the design (§17: "revoking accessibility → alert" is inferred, not just self-reported) |
| Weak/unsalted PIN hashing (e.g., plain SHA-256 with no salt) | Parent PIN brute-forced or rainbow-tabled if the hash ever leaks via a Firestore misconfiguration | Use PBKDF2 or Argon2 with a per-device random salt, exactly as §17 specifies — verify the actual implementation matches the spec, not just the intent |
| Overly broad Firestore security rules (`if request.auth != null`) | Any authenticated device principal (including another family's paired child device) could read/write unrelated families' data | Scope every rule to `resource.data.familyId == request.auth.token.familyId` (or equivalent), unit-test with the Firebase emulator (already planned §16.3/§20) before any rule change ships |
| API keys or provider secrets embedded in the RN bundle "temporarily" during Phase 6 development | Static analysis of the shipped APK/AAB extracts Groq/Gemini keys, enabling quota-draining abuse by third parties | Never call Groq/Gemini directly from the app even in dev builds; use the Worker proxy from the very first AI commit, with a local Worker dev server for iteration |
| Pairing code brute-forcing (6-digit code, 10-minute window) | An attacker could attempt to guess a valid pairing code to join someone else's family and access a child's data | Rate-limit `/pair/redeem` by IP and by code attempt count in the Worker (already implied by "rate-limited by IP + code" in §15.2 — verify a concrete threshold is implemented, not just planned) |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Block screen reads as punitive/shaming (harsh red, guilt-tripping copy) | Resentment, uninstalls, defeats the "non-coercive by design" positioning (§3.1) | Calm, non-judgmental copy and color exactly as designed (§6.4) — QA this specifically as a tone check every time block-screen copy changes, not just once |
| No visible progress indicator across the 4–5 permission onboarding screens | Users abandon mid-onboarding, especially on the OEM-specific step, without understanding how much is left | Add a lightweight step indicator to the permissions flow; let users skip and land in the documented "limited" banner state (already planned) rather than getting stuck |
| Child-mode persistent notification copy reads as surveillance rather than transparency | Erodes trust between parent and child, or gets reported as suspicious by the child | Keep the literal, neutral framing already planned ("This device is managed by \<Family\>"), user-test the copy with an actual teen persona reaction, not just internal review |
| AI features fail silently (infinite spinner) when both Groq and Gemini are exhausted/down | Feels like a bug, not a graceful degradation, eroding trust in the whole app | Every AI entry point (not just chat) must show an explicit "Try again later" state — verify this per-feature in Phase 6 QA, since it's easy to build the happy path and forget the failure path for suggestions/reports/nudges individually |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Accessibility service "enabled":** Often looks done because the Settings toggle is green — verify it's actually *bound* (service connected, receiving events) after a real OEM background-kill-and-restore cycle, not just after a fresh install.
- [ ] **Block screen defeats navigation:** Often tested only against a normal Back-button tap — verify it also survives Recents-button spam, Home-button-then-reopen, and (where applicable) split-screen re-entry into the blocked app.
- [ ] **Offline/no-JS enforcement:** Often "works" because the dev build always has the JS bundle warm — verify blocking/unblocking functions correctly in airplane mode *and* immediately after a device reboot where the RN app has never been opened, per §13.4's own AC.
- [ ] **RTL support:** Often looks done because Urdu text renders right-to-left — verify icon mirroring (back chevrons, wave direction), chart/heatmap axis direction, and that the direction-switch reload actually happens with user-visible messaging, not just text alignment.
- [ ] **Account deletion:** Often looks done because a button exists and shows a success toast — verify it actually cascades family/child Firestore data deletion within the stated window (§17: 30 days, immediate for the family doc tree), tested against a real Firestore project, not mocked.
- [ ] **AI graceful degradation:** Often tested only for the main coach chat — verify smart suggestions, intent check, doom-scroll nudges, and both weekly reports (self + parent) each independently show a clear unavailable-state when Groq+Gemini both fail, not just the chat screen.
- [ ] **Instant limit removal:** Often verified only for the currently-blocked app — verify removing/toggling off a *different* limit that also applies to the currently visible app re-evaluates and doesn't leave a stale block screen up.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| Play rejects for accessibility/monitoring policy | MEDIUM | Read the specific rejection reason in Play Console carefully, correct disclosure copy/manifest flags/demo video precisely to match, resubmit; avoid guessing — vague resubmissions often get rejected again for the same reason worded differently |
| Discover post-launch that an OEM silently kills the service for a large user segment | MEDIUM–HIGH | Ship an immediate OTA (`expo-updates`, JS/copy only — never permission behavior per §21) improving the OEM guide and watchdog messaging; a real native fix (e.g., new autostart deep link) requires a full app update through Play review |
| Firebase Spark quota exceeded in production | LOW–MEDIUM | Upgrade the project to Blaze (pay-as-you-go from that point forward, no data loss), then tighten write batching/listener discipline to control ongoing cost |
| Groq and/or Gemini free tier exhausted mid-day | LOW | Automatic failover between providers already planned; if both are exhausted, the existing graceful-degradation UX absorbs it — no user-facing recovery needed beyond that being actually implemented everywhere (see UX Pitfalls) |
| Urdu RTL layout broken discovered late in the roadmap | MEDIUM–HIGH | Because RTL must be foundational (`start`/`end` styling everywhere, per §11), a late discovery means a systematic app-wide audit/fix rather than a local patch — budget this as its own mini-project if RTL wasn't done correctly from Phase 2 |
| BAL exemption closed by a future Android release | MEDIUM | Fall back to the already-designed `GLOBAL_ACTION_HOME` + heads-up-notification path (§13.5); this is a planned degradation, not a rewrite, provided the fallback was kept production-ready rather than left as spike-only code |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|---------------|
| isAccessibilityTool / prominent disclosure misdeclaration | Phase 3 (build), Phase 7 (declare) | Disclosure screen + demo video reviewed against Play's exact reviewer checklist before submission |
| IsMonitoringTool flag on all tracks | Phase 5 (wire into config plugin), Phase 7 (audit) | Manifest diff compared across internal/closed/production track builds shows identical compliance metadata |
| Families/target-audience misdeclaration | Phase 7 | Reviewer note drafted explicitly addressing child-operated mode; content rating/target audience cross-checked against store listing copy |
| Target API level drift | Phase 0 (initial pick), Phase 7 (re-verify every release) | CI/checklist step fetches current Play requirement rather than trusting a hardcoded value |
| 12-testers/14-days + account type | Phase 0 (decide account type), Phase 7 (execute) | Weekly tester-opt-in count tracked; ≥15 testers recruited as buffer |
| OEM background killing / accessibility silently disabled | Phase 1 (watchdog scaffolding), Phase 7 (OEM matrix) | Watchdog notification verified to fire after a real kill-and-restore test on Xiaomi/Samsung/Oppo/Vivo hardware, not just emulator |
| Android 13+ restricted settings blocking sideloaded testers | Phase 3 (in-app detection/guide) | Onboarding flow detects the greyed-out toggle state and shows the exact "Allow restricted settings" path, verified on a real sideloaded debug build |
| BAL restrictions breaking BlockActivity | Phase 0 (spike), ongoing (yearly re-validation) | Fallback `GLOBAL_ACTION_HOME` path kept production-ready and re-tested against each new Android beta |
| Free-tier LLM quota exhaustion (org-wide) | Phase 6 | Global Worker-side quota tracker load-tested at projected launch concurrency, not just functionally |
| Firebase Spark quota exhaustion | Phase 5 (listener discipline), Phase 7 (monitoring/alerting) | Daily Firestore read/write counters instrumented and alerting before the ~250-active-children threshold is reached |
| Expo prebuild native-file drift | Phase 0 (CNG discipline + CI `prebuild --clean`), Phase 1 (native module) | `git diff` on `android/`/`ios/` treated as a red flag in code review; config-plugin-only policy enforced |
| Skia/Reanimated idle-loop battery/perf drain | Phase 2 (build), Phase 4 (ocean world adds load), Phase 7 (battery budget) | Battery/CPU profiling on a mid/low-end device with Home screen backgrounded and foregrounded repeatedly |
| Usage accuracy vs. Digital Wellbeing | Phase 1 | `queryEvents`-based tracker validated against a controlled test scenario, not just against DW's (sometimes wrong) number |
| Undersold bypass surface (profiles, safe mode) | Phase 3 (self mode), Phase 5 (parental alerts/copy) | Parent-facing FAQ/settings explicitly lists known limitations; tamper-alert coverage matches what's actually detectable |
| Urdu Nastaliq / RTL incomplete | Phase 2 (foundations), every subsequent UI phase | RTL visual-QA checklist (icon mirroring, chart direction, line-height) run every phase that adds UI, not only Phase 2 |
| Account-deletion/privacy-policy link rot | Phase 7, every release thereafter | Automated smoke test hits both URLs and asserts expected content before each release |

## Sources

**Official / primary (treat as authoritative, but re-verify at execution time since these pages update frequently):**
- [Target API level requirements for Google Play apps — Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Google Play's Target API Level Policy — Play Console Help](https://support.google.com/googleplay/android-developer/answer/16561298)
- [Use of the AccessibilityService API — Play Console Help](https://support.google.com/googleplay/android-developer/answer/10964491)
- [Best practices for prominent disclosure and consent — Play Console Help](https://support.google.com/googleplay/android-developer/answer/11150561)
- [Use of the isMonitoringTool Flag — Play Console Help](https://support.google.com/googleplay/android-developer/answer/12955211)
- [App testing requirements for new personal developer accounts — Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Requirements for providing sign-in details for review — Play Console Help](https://support.google.com/googleplay/android-developer/answer/15748846)
- [Preview: Google Play Families Policies — Play Console Help](https://support.google.com/googleplay/android-developer/answer/17122218)
- [Provide information for Google Play's Data Safety section — Play Console Help](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Foreground service types are required — Android Developers](https://developer.android.com/about/versions/14/changes/fgs-types-required)
- [Foreground service types — Android Developers](https://developer.android.com/develop/background-work/services/fgs/service-types)
- [Restrictions on starting activities from the background — Android Developers](https://developer.android.com/guide/components/activities/background-starts)
- [Behavior changes: apps targeting Android 15 — Android Developers](https://developer.android.com/about/versions/15/behavior-changes-15)
- [Firestore quotas and limits — Google Cloud Docs](https://firebase.google.com/docs/firestore/quotas)
- [Continuous Native Generation (CNG) — Expo Docs](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Tutorial: Create a module with a config plugin — Expo Docs](https://docs.expo.dev/modules/config-plugin-and-native-module-tutorial/)

**Community / secondary (cross-checked against the above where possible; treat as directional, re-verify anything release-blocking):**
- [Android 13 blocks unwarranted use of accessibility services by further restricting sideloaded apps — Android Police](https://www.androidpolice.com/android-13-blocks-accessibility-services-sideloaded-apps/)
- [Android 13's New Sideloading Restriction — Esper](https://www.esper.io/blog/android-13-sideloading-restriction-harder-malware-abuse-accessibility-apis)
- [Don't kill my app! — dontkillmyapp.com](https://dontkillmyapp.com/) and [Xiaomi-specific page](https://dontkillmyapp.com/xiaomi)
- [OEM background-execution survival testing issue — jsconu/OpenScreenTime (GitHub)](https://github.com/jsconu/OpenScreenTime/issues/5) — an analogous open-source screen-time app explicitly scoping the same OEM-kill risk this project must validate on real hardware
- [Accessibility disclosure review issue — MaximilianMauroner/zen-mode (GitHub)](https://github.com/MaximilianMauroner/zen-mode/issues/11) — another comparable app's real Play accessibility-disclosure review checklist
- [Google Play 12 Testers Policy Explained (2026) — Testers Community](https://www.testerscommunity.com/blog/google-play-12-testers-policy)
- [Personal vs Organization Google Play Account — onTest](https://ontest.app/blog/personal-vs-organization-google-play-account-12-testers)
- [Google Play App Rejected in 2026: Rejection Reasons Decoded — QAwerk](https://qawerk.com/blog/google-play-rejection-reasons/)
- [Google Play Data Safety Form (2026) — nasrtech](https://www.nasrtech.dev/blog/google-play-data-safety-explained/)
- [Chasing a Phantom Jump: Profiling Skia + Reanimated on Low-End Android — Margelo](https://margelo.com/blog/profiling-skia-reanimated-low-end-android)
- [React Native Reanimated performance guide — Software Mansion Docs](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- [Line-height problem in Noto Nastaliq — notofonts/noto-fonts (GitHub)](https://github.com/notofonts/noto-fonts/issues/198)
- [Groq API Free Tier Limits in 2026 — Grizzly Peak Software](https://www.grizzlypeaksoftware.com/articles/p/groq-api-free-tier-limits-in-2026-what-you-actually-get-uwysd6mb) and [TokenMix Groq rate-limit breakdown](https://tokenmix.ai/blog/groq-free-tier-limits-2026)
- [Walking the Android (time)line — using Digital Wellbeing to timeline activity](https://thebinaryhick.blog/2020/02/22/walking-the-android-timeline-using-androids-digital-wellbeing-to-timeline-android-activity/) (context for Digital Wellbeing's own known inaccuracies)

---
*Pitfalls research for: Android screen-time limiter / app blocker / parental-control app (React Native + Expo)*
*Researched: 2026-09-25*
