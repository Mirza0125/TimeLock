# Codebase Map — ScreenLimiter

_Generated: 2026-10-28 13:45 | Commit: 77f7074c_


## Directory Tree

```
ScreenLimiter/
  .expo/
    dev/
      logs/
        start.log
    web/
      cache/
        production/
  .planning/
    phases/
      01-foundation-block-launch-spike/
        spike-evidence/
        01-01-PLAN.md
        01-01-SUMMARY.md
        01-02-PLAN.md
        01-02-SUMMARY.md
        01-03-PLAN.md
        01-03-SUMMARY.md
        01-04-PLAN.md
        01-04-SUMMARY.md
        01-05-PLAN.md
        01-05-SUMMARY.md
        01-06-PLAN.md
        01-06-SUMMARY.md
        01-07-PLAN.md
        01-07-SUMMARY.md
        01-08-PLAN.md
        01-08-SUMMARY.md
        01-RESEARCH.md
        01-REVIEW-FIX.md
        01-REVIEW.md
        01-UAT.md
        01-VALIDATION.md
        01-VERIFICATION.md
        COVERAGE.md
        SKELETON.md
    research/
      .cache/
        0f6f0ee39de539a76f272f71d70d8e6decfffd87c9d2c76a4c8a925c93e4cdba.json
        0f9bf5495af30f63e4ce90488d51f8a7afb248df8308ebe79ecf67b5ea5aae5a.json
        127aa4fc61dc73c524999b2469872ec4dcdef4f3fad050668c873e44cc7ce6ba.json
        18bd9c2d323be047c918921c457ed63f338e7278533400076f04ebb76e254607.json
        18bd9c2d323be047c918921c457ed63f338e7278533400076f04ebb76e254608.json
        1c3d1ea0dd12e75024d41a431a02a50258c1b6250e6e1f3814f5c9110b5bc4eb.json
        2c9db16591d23ff1731a5c50d675ad0cf63834ef0ff4d814c261dd486be855d4.json
        38a973c9eb67bc4749c537b5f19bffc1b3ae6172c974cf3036a926432483c882.json
        3c108fd5e990186e48798bb4b1f2b922bd662070dbc51ad95fc5753646dd8ce7.json
        52e618b6533c7968943f0c13de40c5a9913ee0f170eb317cac965e2ae7f641bf.json
        658b17f5c06794ff6faf62c1cf167217a2ada020cb3dd08b138802e1ea1a51ee.json
        822bd502d72fa9f56342bcaf01b001d4e1bd22665c9122609d29252d5cdf23ab.json
        87fdb9320fe458414ff65a127bfa8284bf6067f8fc550b6760414a996afe0a43.json
        8dfc07a4f704da93c6c397b0ff0adc6abfde132fb61396718502ad1c5c66c4e0.json
        9595eba52362c4268f9537f54c66553988755a029f533e91708ba26f8cefeacc.json
        9ac287a9bbd0fa1dba413de6b5ea942b53dfbdcb9aace009cb8780a51fa88111.json
        9e27c5e6dcc35dcc2ac10eafe97e20bea80072e184a67a76d7b7ec6a52c1c0af.json
        c5363a2d65129eed4ed364f0672f68f2bf8a373cd3d4c588f65650bf12729f67.json
        d7e32e06b6877a1febc347c23f60133a98e535ba7808a9560da7d901633254e4.json
        e77915c73c593207a26eb5e25a0420dc6916f93a5dc3ebdee59ecd84597d7755.json
        eb4c9d4322ed6d0cbf2d0fc056bd693a69ecc17f92ee5a6036e47ca169578cd7.json
        faf7058cff76876e62eafce1486ab67e953c90b9d64b4b7256b908ef99e3a182.json
        fba1df59e291b01446f626fca2b5badb4aeac39926cb7a2db9492572bfa62cc7.json
      ARCHITECTURE.md
      FEATURES.md
      PITFALLS.md
      STACK.md
      SUMMARY.md
    config.json
    PROJECT.md
    REQUIREMENTS.md
    ROADMAP.md
    state.json
    STATE.md
    WINDOWS.md
  __tests__/
    blockStrategy.test.ts
    home-screen.test.tsx
    screenGuardContract.test.ts
    sharedVectors.test.ts
  android/
    .gradle/
      9.3.1/
        checksums/
        executionHistory/
        expanded/
        fileChanges/
        fileHashes/
        vcsMetadata/
        gc.properties
      buildOutputCleanup/
        buildOutputCleanup.lock
        cache.properties
      noVersion/
        buildLogic.lock
      vcs-1/
        gc.properties
    .kotlin/
      sessions/
    app/
      .cxx/
        Debug/
        tools/
      src/
        debug/
        debugOptimized/
        main/
      build.gradle
      debug.keystore
      proguard-rules.pro
    gradle/
      wrapper/
        gradle-wrapper.jar
        gradle-wrapper.properties
    .gitignore
    build.gradle
    gradle.properties
    gradlew
    gradlew.bat
    settings.gradle
  app/
    _layout.tsx
    index.tsx
  assets/
    android-icon-background.png
    android-icon-foreground.png
    android-icon-monochrome.png
    favicon.png
    icon.png
    splash-icon.png
  docs/
    decisions/
      0001-block-launch-path.md
    DEVELOPMENT.md
    PRODUCT_SPEC.md
  modules/
    screen-guard/
      android/
        src/
        build.gradle
      shared-test-vectors/
        rule-evaluation.json
      src/
        blockStrategy.ts
        ruleEvaluationVectors.ts
        ScreenGuard.types.ts
        ScreenGuardModule.ts
        ScreenGuardModule.web.ts
      expo-module.config.json
      index.ts
      LICENSE
  plugins/
    withScreenGuardAndroid.js
  scripts/
    audit-apk-manifest.sh
    check-rtl-lint-rule.mjs
    e2e-skeleton.sh
    emu-ui.mjs
    env.sh
    gradle.sh
    guard-service.sh
    metro.sh
    permission-allowlist.txt
    run-android.sh
    spike-block-launch.sh
    verify-clean-checkout.sh
    verify-native-config.sh
  .editorconfig
  .gitignore
  .npmrc
  .prettierignore
  .prettierrc.json
  app.json
  eslint.config.js
  jest.config.js
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  README.md
  tsconfig.json
```

## File Distribution

- `.md`: 38 files (30%)
- `.json`: 31 files (24%)
- `.sh`: 10 files (8%)
- `.ts`: 9 files (7%)
- `(no ext)`: 7 files (5%)
- `.png`: 6 files (5%)
- `.properties`: 5 files (4%)
- `.gradle`: 4 files (3%)
- `.tsx`: 3 files (2%)
- `.js`: 3 files (2%)
- `.lock`: 2 files (2%)
- `.mjs`: 2 files (2%)
- `.yaml`: 2 files (2%)
- `.log`: 1 files (1%)
- `.keystore`: 1 files (1%)

## Code Index


### `modules/screen-guard/index.ts`
  export { default } from './src/ScreenGuardModule';
  export * from './src/ScreenGuard.types';
  export * from './src/blockStrategy';

### `modules/screen-guard/src/ScreenGuard.types.ts`
  export type Platform = 'android' | 'ios';
  export interface AppRef {
  export type AppCategory =
  export interface InstalledApp {
  export interface Capabilities {
  export type Status = 'granted' | 'denied' | 'notDetermined' | 'unsupported';
  export interface PermissionState {
  export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  export type LocalDate = string;
  export type LocalTime = string;
  export interface DateRange {
  export interface AppUsage {
  export interface UsageDay {
  export type Mode = 'self' | 'parent' | 'child';
  export type EnforcementMode = 'self' | 'child';
  export type RuleSource = 'self' | 'parent';
  export type FrictionKind = 'breathing' | 'phrase' | 'wait';
  export interface FrictionCfg {
  export type RuleType = 'daily' | 'group' | 'schedule' | 'session' | 'openCount';
  export interface RuleBase {

### `modules/screen-guard/src/ScreenGuardModule.ts`
  export default requireNativeModule<ScreenGuardModule>('ScreenGuard');

### `modules/screen-guard/src/ScreenGuardModule.web.ts`
  export default registerWebModule(ScreenGuardModule, 'ScreenGuardModule');

### `modules/screen-guard/src/blockStrategy.ts`
  export type BlockStrategy = 'off' | 'activityFirst' | 'homeNotification';
  export const BLOCK_STRATEGIES: readonly BlockStrategy[] = [
  export function isBlockStrategy(value: unknown): value is BlockStrategy {
  export const BLOCK_STRATEGY_LABELS: Record<BlockStrategy, string> = {

### `modules/screen-guard/src/ruleEvaluationVectors.ts`
  export interface RuleEvaluationVector {
  export interface RuleEvaluationVectorFile {
  export const REQUIRED_VECTOR_TAGS: readonly string[] = [
  export function parseRuleEvaluationVectorFile(json: unknown): RuleEvaluationVectorFile {

### `app/_layout.tsx`
  export default function RootLayout() {

### `app/index.tsx`
  export default function Home() {