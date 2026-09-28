---
phase: 01-foundation-block-launch-spike
reviewed: 2026-09-28T15:10:28Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - app/_layout.tsx
  - app/index.tsx
  - app.json
  - eslint.config.js
  - jest.config.js
  - package.json
  - plugins/withScreenGuardAndroid.js
  - modules/screen-guard/index.ts
  - modules/screen-guard/src/ScreenGuard.types.ts
  - modules/screen-guard/src/ScreenGuardModule.ts
  - modules/screen-guard/src/ScreenGuardModule.web.ts
  - modules/screen-guard/src/blockStrategy.ts
  - modules/screen-guard/src/ruleEvaluationVectors.ts
  - modules/screen-guard/android/build.gradle
  - modules/screen-guard/android/src/main/AndroidManifest.xml
  - modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockActivity.kt
  - modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockLauncher.kt
  - modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockOutcomeDecider.kt
  - modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockStrategyStore.kt
  - modules/screen-guard/android/src/main/java/expo/modules/screenguard/GuardAccessibilityService.kt
  - modules/screen-guard/android/src/main/java/expo/modules/screenguard/ScreenGuardModule.kt
  - modules/screen-guard/android/src/main/res/values/strings.xml
  - modules/screen-guard/android/src/test/java/expo/modules/screenguard/BlockOutcomeDeciderTest.kt
  - modules/screen-guard/android/src/test/java/expo/modules/screenguard/SharedVectorsLoaderTest.kt
  - __tests__/blockStrategy.test.ts
  - __tests__/home-screen.test.tsx
  - __tests__/screenGuardContract.test.ts
  - __tests__/sharedVectors.test.ts
  - scripts/env.sh
  - scripts/run-android.sh
  - scripts/metro.sh
  - scripts/gradle.sh
  - scripts/guard-service.sh
  - scripts/e2e-skeleton.sh
  - scripts/emu-ui.mjs
  - scripts/check-rtl-lint-rule.mjs
  - scripts/audit-apk-manifest.sh
  - scripts/verify-native-config.sh
  - scripts/verify-clean-checkout.sh
  - scripts/spike-block-launch.sh
findings:
  critical: 1
  warning: 5
  info: 2
  total: 8
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-09-28T15:10:28Z
**Depth:** standard
**Files Reviewed:** 32 (required_reading list; some entries are directories/groups counted as one file each where listed)
**Status:** issues_found

## Summary

Reviewed the Phase 1 foundation + block-launch-spike source: the Expo Router shell, the `screen-guard` native module (TS contract + Kotlin implementation), the `withScreenGuardAndroid` config plugin, the shared rule-evaluation vector validator, and the full shell/Node script suite used for prebuild verification, APK auditing, and the block-launch spike itself.

The scripts and TypeScript contract layer are unusually careful — idempotency, debounce, and reproducibility are explicitly designed for and mostly hold up under inspection. However, cross-referencing `app.json`'s `predictiveBackGestureEnabled: false` against the generated `AndroidManifest.xml` and `BlockActivity.kt`'s back-handling logic surfaces a genuine functional bypass of the block screen on API 33+ devices (CR-01) — this defeats the core purpose of the feature being spiked and should be fixed before this ships past the spike stage. Several warnings around null-safety, validator completeness, and a script's regex coverage gap are also documented below.

## Critical Issues

### CR-01: Back button/gesture on BlockActivity can return the user to the blocked app on API 33+

**File:** `modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockActivity.kt:48-62`

**Issue:**
`BlockActivity` documents an explicit invariant: "Close and Back both send the device home - never back into the blocked app." The implementation tries to satisfy this two ways:

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    buildLayout()
    applyBlockedPackage(intent)

    if (Build.VERSION.SDK_INT >= 33) {
        onBackInvokedDispatcher.registerOnBackInvokedCallback(
            android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT
        ) { goHome() }
    }
}

@Suppress("DEPRECATION")
override fun onBackPressed() {
    if (Build.VERSION.SDK_INT < 33) {
        goHome()
    } else {
        super.onBackPressed()
    }
}
```

For API >= 33 the code relies entirely on the registered `OnBackInvokedCallback` to call `goHome()`, and falls through to `super.onBackPressed()` (which defaults to `finish()`) on the assumption the callback will have handled it first.

That assumption is false in this app. `app.json` sets:

```json
"predictiveBackGestureEnabled": false
```

which Expo's config plugin renders into the generated manifest at the `<application>` level (confirmed directly in this checkout's generated output, `android/app/src/main/AndroidManifest.xml:20`):

```
<application ... android:enableOnBackInvokedCallback="false">
```

`BlockActivity`'s own manifest entry (added by `plugins/withScreenGuardAndroid.js`, `android/app/src/main/AndroidManifest.xml:43`) does not override this attribute per-activity, so it inherits `enableOnBackInvokedCallback="false"` from the application tag. When that flag is `false`, the system does not route back navigation through `OnBackInvokedDispatcher` at all — it uses the legacy `onBackPressed()` key-event path instead, and the platform silently never invokes the registered callback.

The net effect: on any API 33+ device/emulator built from this exact config, pressing back (button or gesture) while `BlockActivity` is on screen calls `super.onBackPressed()`, which finishes the activity via the default `Activity.onBackPressed()` implementation instead of calling `goHome()`. Because `BlockActivity` is launched as its own task (`android:taskAffinity=""`, `singleTask`, `FLAG_ACTIVITY_NEW_TASK`) on top of the just-blocked app, finishing it returns the user to whatever task was in the foreground immediately before the block fired — i.e., back into the blocked app. This directly defeats the block on the API level this project targets (`targetSdkVersion 36`, `compileSdkVersion 36`, verified minSdk 24 — API 33+ is squarely in the supported/primary range).

**Fix:** Don't rely on `OnBackInvokedDispatcher` firing; either force `goHome()` unconditionally in `onBackPressed()` regardless of SDK level, or explicitly opt this activity back in to predictive back independent of the app-wide flag:

```kotlin
@Suppress("DEPRECATION")
override fun onBackPressed() {
    // Never defer to super — enableOnBackInvokedCallback is app-wide "false"
    // (app.json predictiveBackGestureEnabled), so the OnBackInvokedDispatcher
    // callback registered in onCreate is never invoked by the system on any
    // SDK level. Always go home directly instead of relying on it.
    goHome()
}
```

or, in `plugins/withScreenGuardAndroid.js`, add `'android:enableOnBackInvokedCallback': 'true'` to `BlockActivity`'s manifest `$` attributes so the per-activity override takes precedence over the application-level `false`. The `onBackPressed()` fallback above is the more robust fix since it doesn't depend on a manifest attribute continuing to be respected by future Android versions.

## Warnings

### WR-01: Unguarded nullable `NotificationManager` can crash the guaranteed fallback path

**File:** `modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockLauncher.kt:101-102`

**Issue:** `postFallbackNotification` calls `service.getSystemService(NotificationManager::class.java)` and immediately calls `.areNotificationsEnabled()` on the result with no null check:

```kotlin
val notificationManager = service.getSystemService(NotificationManager::class.java)
if (!notificationManager.areNotificationsEnabled()) {
```

`getSystemService(Class<T>)` is a Java platform type from Kotlin's perspective (not `@NonNull`-annotated in a way Kotlin enforces), and this exact API is treated as nullable elsewhere in the same module: `BlockActivity.kt:89` calls `getSystemService(NotificationManager::class.java)?.cancel(...)` with a safe call. If `getSystemService` ever returns `null` here (e.g. under a Robolectric/test harness, a stripped-down OEM ROM, or a future OS edge case), this throws an NPE inside the accessibility service's event-handling path — for the `homeNotification` strategy, this is documented as "the guaranteed path," so a crash here undermines the one path meant to always work, and would restart/unbind the accessibility service.

**Fix:**
```kotlin
val notificationManager = service.getSystemService(NotificationManager::class.java) ?: run {
    Log.w(TAG, "NOTIFY_SKIPPED reason=no_notification_manager pkg=$pkg")
    return false
}
if (!notificationManager.areNotificationsEnabled()) { ... }
```

### WR-02: Shared rule-evaluation vector validator doesn't check all required `RuleEvaluationInput` fields

**File:** `modules/screen-guard/src/ruleEvaluationVectors.ts:182-215`

**Issue:** The module's doc comment claims to catch "any structural or internal-consistency violation" in the shared vectors file, and `SharedVectorsLoaderTest.kt`/`sharedVectors.test.ts` both trust this validator as the single source of truth cross-checked between TS and Kotlin. However, `parseRuleEvaluationVectorFile` never validates several fields that `RuleEvaluationInput` (in `ScreenGuard.types.ts`) declares as required:
- `input.timeZone` (required `string`) — never read or type-checked.
- `input.mode` (required `EnforcementMode`) — never read or type-checked.
- `input.continuousUseMinutes` (required `number`) — never read or type-checked.
- `AppUsageToday.minutes` / `.opens` inside `input.usageToday[i]` — only `.ref` is validated via `validateAppRef`; `minutes`/`opens` are never checked to exist or be numbers.

A vector with a missing or malformed `timeZone`/`mode`/`continuousUseMinutes`, or a non-numeric `usageToday[i].minutes`, will pass validation silently today, then fail confusingly later when Phase 2/4's TS and Kotlin evaluators are written against these vectors — exactly the class of "malformed vector silently misleading either side" failure this validator exists to prevent (per its own doc comment referencing threat T-01-07).

**Fix:** Add checks alongside the existing `nowMs` check, e.g.:
```typescript
if (typeof input.timeZone !== 'string') fail(id, 'input.timeZone', 'must be a string');
if (input.mode !== 'self' && input.mode !== 'child') fail(id, 'input.mode', 'must be "self" or "child"');
if (typeof input.continuousUseMinutes !== 'number') fail(id, 'input.continuousUseMinutes', 'must be a number');
// inside the usageToday.forEach:
if (typeof u.minutes !== 'number') fail(id, `input.usageToday[${i}].minutes`, 'must be a number');
if (typeof u.opens !== 'number') fail(id, `input.usageToday[${i}].opens`, 'must be a number');
```

### WR-03: APK permission audit misses `maxSdkVersion`-scoped permission declarations

**File:** `scripts/audit-apk-manifest.sh:75`

**Issue:** `check_permissions` extracts permission names with:
```bash
mapfile -t perms < <(sed -n "s/.*uses-permission: name='\([^']*\)'.*/\1/p")
```
`aapt2 dump permissions` renders a permission declared with `android:maxSdkVersion` as `uses-permission-sdk-23: name='...'` (a distinct line prefix), not `uses-permission: name='...'`. The regex requires the literal substring `uses-permission: name=` and will never match a `uses-permission-sdk-23:` line, so any such permission — denylisted or not — is silently excluded from both the denylist and allowlist gate. Given this script is the enforcement mechanism for the "no QUERY_ALL_PACKAGES / SYSTEM_ALERT_WINDOW" project constraint, a future dependency that adds a denylisted permission scoped with `maxSdkVersion` would pass `APK_AUDIT_OK` undetected.

**Fix:** Broaden the pattern to match both forms:
```bash
mapfile -t perms < <(sed -n "s/.*uses-permission\(-sdk-[0-9]\+\)\?: name='\([^']*\)'.*/\2/p")
```

### WR-04: `withScreenGuardAndroid.js` can throw if `manifest.queries` is an empty array

**File:** `plugins/withScreenGuardAndroid.js:104-105`

**Issue:**
```javascript
manifest.queries = manifest.queries ?? [{}];
const queriesBlock = manifest.queries[0];
queriesBlock.intent = queriesBlock.intent ?? [];
```
`??` only substitutes on `null`/`undefined`. If any other config plugin (present or future, in this mod chain or a subsequently-added one) sets `manifest.queries = []` (a valid, non-nullish empty array) before this mod runs, `manifest.queries[0]` is `undefined`, and the following line throws `Cannot set properties of undefined (setting 'intent')`, breaking `expo prebuild` with a confusing stack trace far from the actual cause.

**Fix:** Guard on array length instead of nullishness:
```javascript
if (!Array.isArray(manifest.queries) || manifest.queries.length === 0) {
  manifest.queries = [{}];
}
const queriesBlock = manifest.queries[0];
```

### WR-05: Home screen doesn't guard against overlapping strategy-change requests

**File:** `app/index.tsx:35-44`

**Issue:** `onPressStrategy` is not disabled while a previous call is in flight, and there is no request-ordering guard:
```typescript
const onPressStrategy = useCallback(async (value: BlockStrategy) => {
  try {
    await ScreenGuard.setBlockStrategy(value);
    const refreshed = await ScreenGuard.getBlockStrategy();
    setStrategy(refreshed);
    ...
```
If a user (or, more relevantly, an automated E2E script like `scripts/emu-ui.mjs`/`scripts/spike-block-launch.sh` retrying a tap) presses two different strategy buttons in quick succession, the two `setBlockStrategy`/`getBlockStrategy` promise pairs can interleave and resolve out of order, so the displayed `strategy` value can end up not matching the last strategy the user actually pressed (and not matching what's persisted either, since persistence itself follows the same non-atomic set/get pattern per press). The buttons all stay enabled throughout, so nothing prevents the double-press.

**Fix:** Track an in-flight/generation token (or simply disable the pressables) so a stale response can't overwrite a newer one:
```typescript
const requestId = useRef(0);
const onPressStrategy = useCallback(async (value: BlockStrategy) => {
  const id = ++requestId.current;
  try {
    await ScreenGuard.setBlockStrategy(value);
    const refreshed = await ScreenGuard.getBlockStrategy();
    if (id !== requestId.current) return; // a newer press superseded this one
    setStrategy(refreshed);
    setError(null);
  } catch (err) {
    if (id !== requestId.current) return;
    setError(err instanceof Error ? err.message : String(err));
  }
}, []);
```

## Info

### IN-01: Kotlin lint failures don't fail the build

**File:** `modules/screen-guard/android/build.gradle:16-18`

**Issue:** `lintOptions { abortOnError false }` means `:screen-guard:lint`-family tasks will never fail CI/local `pnpm verify` runs even on real lint errors (as opposed to `ktlintCheck`, which is a separate, still-enforced task). This is a quality/visibility gap rather than a functional bug — lint issues will only ever be seen if someone manually reads the report.

**Fix:** If this was intentional (e.g. to avoid noisy AGP/manifest lint failures unrelated to this module), consider scoping the suppression to specific lint rule IDs instead of a blanket `abortOnError false`, so genuine regressions still fail the build.

### IN-02: Activity-confirmation signal is a shared global, not scoped per attempt

**File:** `modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockActivity.kt:29-32`, `BlockLauncher.kt:75-88`

**Issue:** `BlockSignals.lastResumedAtMs` is a single `@Volatile` global updated on every `BlockActivity.onResume()`. `BlockLauncher.attemptActivity` reads it 800ms after issuing `startActivity`, and `BlockOutcomeDecider.isConfirmed` only checks that the resume timestamp falls in `[attemptAtMs, attemptAtMs + CONFIRM_DEADLINE_MS]`. If the user manually navigates back into an already-open `BlockActivity` instance (e.g. from recents, before `excludeFromRecents` fully takes effect, or via a stacked `onNewIntent`) within that same 800ms window for an unrelated reason, `onResume()` fires and could be misattributed as confirmation of the specific attempt being checked. This is a known best-effort heuristic already acknowledged in the surrounding comments (no better OS-level signal exists pre-API 36's `detectBlockedBackgroundActivityLaunch`), so it is not classified as a Warning — flagging for visibility only, since a per-attempt token compared against `lastResumedAtMs` (rather than a pure time-window check) would remove the ambiguity entirely at low cost.

---

_Reviewed: 2026-09-28T15:10:28Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
