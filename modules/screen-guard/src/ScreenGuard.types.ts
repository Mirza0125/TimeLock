/**
 * ScreenGuard shared contract — FROZEN in Phase 1 (FND-05).
 *
 * This file is the single source of truth for the cross-platform
 * ScreenGuard API (spec PRODUCT_SPEC.md §12.2), its shared domain model
 * (§16.1), and the evaluation input/output shape the rule-evaluation
 * vectors (modules/screen-guard/shared-test-vectors/rule-evaluation.json)
 * are written against.
 *
 * Any change to a type here MUST be made together with:
 *  - the Kotlin mirror (`LimitEngine` / Room entities on Android),
 *  - the shared rule-evaluation vectors, and
 *  - the iOS module plan (v2.0),
 * in the same change. No rule evaluator exists yet — vectors and this
 * contract come first (FND-05 ordering).
 */

// ---------------------------------------------------------------------------
// Platform & app identity (spec §12.2)
// ---------------------------------------------------------------------------

/** The two platforms ScreenGuard ships on. iOS support arrives in v2.0. */
export type Platform = 'android' | 'ios';

/** A cross-platform app identifier. Android: package name. iOS: opaque base64 token. */
export interface AppRef {
  platform: Platform;
  id: string;
}

/** Coarse app category used for group limits and installed-app listing. */
export type AppCategory =
  | 'games'
  | 'audio'
  | 'video'
  | 'image'
  | 'social'
  | 'news'
  | 'maps'
  | 'productivity'
  | 'accessibility'
  | 'other';

/** An installed app as surfaced by `getInstalledApps()`. */
export interface InstalledApp {
  ref: AppRef;
  name: string;
  category: AppCategory;
  iconUri?: string;
}

/** Feature-flag surface the UI reads to hide unsupported functionality per platform. */
export interface Capabilities {
  listApps: boolean;
  rawUsage: boolean;
  sessionLimits: boolean;
  openCountLimits: boolean;
  websiteLimits: boolean;
  customBlockScreen: boolean;
}

/** Generic status for any permission-like capability. */
export type Status = 'granted' | 'denied' | 'notDetermined' | 'unsupported';

/** Snapshot of every permission ScreenGuard depends on. */
export interface PermissionState {
  usageAccess: Status;
  accessibility: Status;
  notifications: Status;
  batteryOptimizationExempt: Status;
  /** iOS only (Screen Time / Family Controls authorization). */
  screenTimeAuthorization?: Status;
}

// ---------------------------------------------------------------------------
// Shared domain (spec §16.1)
// ---------------------------------------------------------------------------

/** Three-letter lowercase weekday code. */
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Calendar date, 'YYYY-MM-DD'. */
export type LocalDate = string;

/** Wall-clock time, 24h 'HH:mm'. */
export type LocalTime = string;

/** A half-open local date range used by `getUsage`. */
export interface DateRange {
  from: LocalDate;
  to: LocalDate;
}

/** Per-app usage for a single day, as returned inside a `UsageDay`. */
export interface AppUsage {
  ref: AppRef;
  minutes: number;
  opens: number;
  /** 24 entries, one per hour of the day, minutes used in that hour. */
  hourly: number[];
}

/** One day of usage history, as returned by `getUsage`. */
export interface UsageDay {
  date: LocalDate;
  apps: AppUsage[];
  pickups: number;
}

/** Who ScreenGuard is enforcing for on this device. */
export type Mode = 'self' | 'parent' | 'child';

/** The subset of `Mode` the rule evaluator actually branches on. */
export type EnforcementMode = 'self' | 'child';

/** Who authored a rule or grant. */
export type RuleSource = 'self' | 'parent';

/** Friction-unlock technique offered on the block screen (spec §6.5). */
export type FrictionKind = 'breathing' | 'phrase' | 'wait';

/**
 * Friction-unlock configuration for a daily/group limit.
 * Spec §6.5 defaults (5 extra minutes, max 3 grants/day) are documented
 * here, not encoded as literal defaults — every rule must set them explicitly.
 */
export interface FrictionCfg {
  kind: FrictionKind;
  /** Minutes granted per successful unlock. Spec default: 5 (configurable 1-15). */
  extraMinutes: number;
  /** Max grants per app per day. Spec default: 3. */
  maxPerDay: number;
}

/** Discriminant for the `Rule` union. */
export type RuleType = 'daily' | 'group' | 'schedule' | 'session' | 'openCount';

/** Fields shared by every rule type. */
export interface RuleBase {
  id: string;
  type: RuleType;
  name: string;
  enabled: boolean;
  /** Weekdays this rule is active on. Default: all seven. */
  days: Weekday[];
  createdAt: number;
  updatedAt: number;
  source: RuleSource;
}

/** Per-app daily time limit, with an optional per-weekday override. */
export interface DailyRule extends RuleBase {
  type: 'daily';
  targets: AppRef[];
  minutes: number;
  perDay?: Partial<Record<Weekday, number>>;
  friction: FrictionCfg;
}

/** Shared time budget across a category or a custom set of apps. */
export interface GroupRule extends RuleBase {
  type: 'group';
  category?: AppCategory;
  targets: AppRef[];
  minutes: number;
  friction: FrictionCfg;
}

/** A time-of-day window. `end <= start` means the window crosses midnight. */
export interface ScheduleWindow {
  start: LocalTime;
  end: LocalTime;
}

/** Downtime/schedule rule: blocks inside one or more windows. */
export interface ScheduleRule extends RuleBase {
  type: 'schedule';
  windows: ScheduleWindow[];
  blockAll: boolean;
  targets: AppRef[];
  allowlist: AppRef[];
}

/** Blocks after continuous use reaches `sessionMin`, for `breakMin`. */
export interface SessionRule extends RuleBase {
  type: 'session';
  targets: AppRef[];
  sessionMin: number;
  breakMin: number;
}

/** Blocks for the rest of the day once opens exceed `maxOpens`. */
export interface OpenCountRule extends RuleBase {
  type: 'openCount';
  targets: AppRef[];
  maxOpens: number;
}

/** Discriminated union of every rule type, keyed on `type`. */
export type Rule = DailyRule | GroupRule | ScheduleRule | SessionRule | OpenCountRule;

/** Who granted an extra-time grant. */
export type GrantSource = 'friction' | 'parent';

/** An active extra-time grant that suppresses daily/group/session/opens blocks. */
export interface Grant {
  id: string;
  target: AppRef;
  /** Epoch ms; the grant is active while `nowMs < until`. */
  until: number;
  source: GrantSource;
}

// ---------------------------------------------------------------------------
// Rule evaluation I/O (needed by the shared vectors, not spec-numbered)
// ---------------------------------------------------------------------------

/** Reason a `RuleDecision` blocked, mirroring the four exceedable limit types. */
export type BlockReason = 'schedule' | 'daily' | 'opens' | 'session';

/**
 * The evaluator's verdict for the current foreground app. A block always
 * carries the rule that caused it and the epoch ms it lifts at.
 */
export type RuleDecision =
  | { decision: 'allow' }
  | { decision: 'block'; reason: BlockReason; ruleId: string; untilMs: number };

/** Today's usage for one app, as the evaluator needs it (opens includes the current open). */
export interface AppUsageToday {
  ref: AppRef;
  minutes: number;
  opens: number;
}

/** Full input the rule evaluator (TS reference + Kotlin LimitEngine) needs for one decision. */
export interface RuleEvaluationInput {
  nowMs: number;
  timeZone: string;
  mode: EnforcementMode;
  foreground: AppRef;
  globalAllowlist: AppRef[];
  rules: Rule[];
  usageToday: AppUsageToday[];
  continuousUseMinutes: number;
  grants: Grant[];
}

// ---------------------------------------------------------------------------
// ScreenGuardApi (spec §12.2)
// ---------------------------------------------------------------------------

/** Remaining budget for one rule, as surfaced by `getLiveStatus`. */
export interface RuleRemaining {
  ruleId: string;
  minutesLeft: number;
}

/** Current foreground app, decision, and per-rule remaining budget. */
export interface LiveStatus {
  foreground: AppRef | null;
  decision: RuleDecision;
  remaining: RuleRemaining[];
}

/** Events ScreenGuard emits via `addListener`. */
export interface ScreenGuardEventMap {
  ruleBlocked: { ref: AppRef; decision: RuleDecision };
  usageTick: { ref: AppRef; minutesToday: number };
  permissionChanged: PermissionState;
  appsChanged: { added: AppRef[]; removed: AppRef[] };
}

/** Handle returned by `addListener`; call `remove()` to unsubscribe. */
export interface Subscription {
  remove(): void;
}

/**
 * The frozen cross-platform ScreenGuard contract. Implemented natively per
 * platform (Kotlin on Android now, Swift on iOS in v2.0). The UI calls
 * `capabilities()` and hides unsupported features instead of branching on
 * platform directly.
 */
export interface ScreenGuardApi {
  capabilities(): Capabilities;
  getPermissionState(): Promise<PermissionState>;
  requestPermission(p: keyof PermissionState): Promise<void>;
  getInstalledApps(): Promise<InstalledApp[]>;
  /** iOS only: presents the native `FamilyActivityPicker`. */
  pickApps?(): Promise<AppRef[]>;
  getUsage(range: DateRange): Promise<UsageDay[]>;
  getLiveStatus(): Promise<LiveStatus>;
  /** Full replace of the rule set; idempotent. */
  setRules(rules: Rule[]): Promise<void>;
  grantExtraTime(ref: AppRef, minutes: number, source: GrantSource): Promise<void>;
  setMode(mode: Mode): Promise<void>;
  setNativeStrings(bundle: Record<string, string>): Promise<void>;
  addListener<E extends keyof ScreenGuardEventMap>(
    event: E,
    callback: (payload: ScreenGuardEventMap[E]) => void,
  ): Subscription;
}
