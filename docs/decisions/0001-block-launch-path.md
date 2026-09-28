# ADR 0001: Block-launch path — activity-first vs. fallback

## Status

Accepted (2026-09-28)

## Context

ScreenGuard's enforcement depends on a bound `AccessibilityService` being able to start a
full-screen `BlockActivity` over a blocked app while that app is in the background — a
background-activity-start (BAL). Android's official BAL documentation lists no stable,
documented exemption for bound accessibility services. This project's own `ARCHITECTURE.md`
flagged that disagreement as a correction against an earlier assumption (`docs/PRODUCT_SPEC.md`
§13.5 hypothesized the exemption would apply); `01-RESEARCH.md` Pattern 3 and Pitfall 3 both
treat the outcome as a genuine unknown that must be measured empirically, not assumed. This ADR
was not written until that measurement existed.

## Method

- Runner: `bash scripts/spike-block-launch.sh --trials 5` (Plan 01-07, `scripts/spike-block-launch.sh`).
- 5 `activityFirst` trials and 5 forced `homeNotification` trials, run back to back on the same
  emulator boot.
- 12 s grace before every trial after ScreenLimiter was last visible (`GRACE_S=12`), so the
  app's own recent-visibility window cannot masquerade as a background launch.
- The `SYSTEM_ALERT_WINDOW` overlay permission is absent from the manifest (`overlayDeclared:
  false`) and its appop is not `allow` (`overlayAppOp: "SYSTEM_ALERT_WINDOW: default; ..."`) —
  verified by the runner immediately before every run, so no overlay exemption could be credited
  to the activity path.
- The ScreenGuard accessibility service was enabled via `adb shell settings put secure
  enabled_accessibility_services` (`scripts/guard-service.sh enable`), which bypasses Android
  13+'s Restricted Settings block on sideloaded apps. **Caveat for Phase 7:** a real user
  enabling the service through the Settings UI after a non-Play sideload does not get this
  bypass — onboarding must walk them through Restricted Settings explicitly.
- `StrictMode.detectBlockedBackgroundActivityLaunch()` (Android 16) was compiled into the
  debuggable build and active during every trial (`strictModeDetectorCompiled: true`, confirmed
  via `javap` in Plan 01-04) — its `penaltyLog()` output, plus generic
  `ActivityTaskManager`/`BAL`-pattern logcat lines, were captured into
  `spike-evidence/logcat-activity-first.txt` on every trial. Zero such lines were observed.
- The notification-tap re-entry point (tapping the fallback notification to reopen the block
  screen) is a PendingIntent-exempt start by design and was never counted as activity-path
  evidence.

## Evidence

Full machine-readable results: [`spike-evidence/summary.json`](../../.planning/phases/01-foundation-block-launch-spike/spike-evidence/summary.json).
Raw logs: [`logcat-activity-first.txt`](../../.planning/phases/01-foundation-block-launch-spike/spike-evidence/logcat-activity-first.txt),
[`logcat-home-notification.txt`](../../.planning/phases/01-foundation-block-launch-spike/spike-evidence/logcat-home-notification.txt).
Screenshots: [`activity-first-trial1.png`](../../.planning/phases/01-foundation-block-launch-spike/spike-evidence/activity-first-trial1.png),
[`home-notification-shade.png`](../../.planning/phases/01-foundation-block-launch-spike/spike-evidence/home-notification-shade.png),
[`home-notification-tap.png`](../../.planning/phases/01-foundation-block-launch-spike/spike-evidence/home-notification-tap.png).

| Metric | Value |
|---|---|
| Device | `Medium_Phone_API_36.1` emulator, `sdk_gphone64_x86_64`, API 36 (Android 16) |
| Build fingerprint | `google/sdk_gphone64_x86_64/emu64xa:16/BP41.250822.007/14042983:user/release-keys` |
| Trials per path | 5 |
| `activityFirst` confirmed / unconfirmed / launchError | 5 / 0 / 0 |
| `activityFirst` latencies (ms) | 691, 202, 282, 265, 240 |
| `activityFirst` max / median latency (ms) | 691 / 265 |
| `activityFirst` attempts per trial | 1, 1, 1, 1, 1 (no debounce collisions) |
| `activityFirst` BAL-block log lines | 0 |
| `activityFirst` StrictMode block lines | 0 |
| `activityFirst` Close app → returns to launcher | true (all 5 trials) |
| `homeNotification` forced / reached launcher / notification posted | 5 / 5 / 5 |
| `homeNotification` notification tap opens BlockActivity | true |
| Overlay permission declared / appop | false / not `allow` |

## Decision Rule (declared before the evidence existed)

Primary = `activity-first` **if and only if**:

1. `activityFirst.confirmed === trials` (all 5 trials confirmed, no unconfirmed/launchError), **and**
2. `activityFirst.maxLatencyMs < 1500` (product spec §6.4's 1.5 s block AC), **and**
3. `activityFirst.balBlockLogLines === 0` (no observed BAL-block signal).

Otherwise: primary = `fallback-home-notification`. A 4/5 result is a fallback result — any
unconfirmed trial means the activity path is not reliable enough to be primary.

Applying the rule: `confirmed=5===trials=5` ✓, `maxLatencyMs=691 < 1500` ✓, `balBlockLogLines=0` ✓.
All three conditions hold.

## Decision

Primary path: activity-first

## Scope

Measured on the Android 16 (API 36) emulator `Medium_Phone_API_36.1`, build
`google/sdk_gphone64_x86_64/emu64xa:16/BP41.250822.007/14042983:user/release-keys`. **This is
not evidence about OEM devices or other API levels.** It is not a claim that the BAL exemption
is a documented or stable Android guarantee — Android's own documentation lists no such
exemption, and this result reflects only the current behavior of this exact emulator image. Do
not read this ADR as "BAL is exempt for bound accessibility services" in general.

## Consequences

- Phase 2's `BlockLauncher` configuration uses `activity-first` as the default strategy
  (`BlockStrategyStore.DEFAULT_STRATEGY = BlockStrategy.ACTIVITY_FIRST`).
- The `GLOBAL_ACTION_HOME` + notification fallback stays wired, production-ready, and exercised
  in the same run regardless of which path is primary — it is the guaranteed path if a future
  Android version, OEM build, or real device tightens BAL further and the activity path starts
  failing.
- Because the primary path is activity-first here, the notification permission is not
  currently onboarding-*critical* the way it would be if fallback were primary — but Phase 7
  should still request it early, since any OEM/device where the activity path is unconfirmed
  falls back to a notification the user must be able to see.
- This ADR does not change `scripts/guard-service.sh`'s adb-based enablement caveat: real users
  enable the accessibility service through the Settings UI, which is subject to Android 13+
  Restricted Settings — a separate Phase 7 concern, not resolved by this ADR.

## Re-validation triggers

- Every new Android release or `targetSdk` bump.
- Phase 12 (`QUAL-01` API 24–36 compatibility matrix; `QUAL-04` real Xiaomi/Samsung devices via
  Firebase Test Lab) — OEM battery/BAL behavior is explicitly out of scope for this ADR and must
  be measured separately.
- The yearly re-validation cadence noted in `.planning/research/PITFALLS.md` Pitfall 8.
- Any change to `modules/screen-guard/android`'s manifest permissions, since a newly declared
  permission (e.g. `SYSTEM_ALERT_WINDOW`) would invalidate this measurement's overlay-absence
  precondition.
