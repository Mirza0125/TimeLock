import type {
  AppRef,
  Capabilities,
  DailyRule,
  DateRange,
  Grant,
  GroupRule,
  InstalledApp,
  LiveStatus,
  OpenCountRule,
  PermissionState,
  Rule,
  RuleDecision,
  ScheduleRule,
  ScreenGuardApi,
  ScreenGuardEventMap,
  SessionRule,
  Subscription,
  UsageDay,
} from '../modules/screen-guard/src/ScreenGuard.types';

const app = (id: string): AppRef => ({ platform: 'android', id });

// ---------------------------------------------------------------------------
// Behavior 1: a fake implementation compiles under `satisfies ScreenGuardApi`
// and has exactly the 12 spec §12.2 methods.
// ---------------------------------------------------------------------------

const capabilities: Capabilities = {
  listApps: true,
  rawUsage: true,
  sessionLimits: true,
  openCountLimits: true,
  websiteLimits: false,
  customBlockScreen: true,
};

const permissionState: PermissionState = {
  usageAccess: 'granted',
  accessibility: 'granted',
  notifications: 'notDetermined',
  batteryOptimizationExempt: 'granted',
};

const installedApp: InstalledApp = {
  ref: app('com.example.video'),
  name: 'Video',
  category: 'video',
};

const usageDay: UsageDay = {
  date: '2026-09-28',
  apps: [{ ref: app('com.example.video'), minutes: 30, opens: 3, hourly: new Array(24).fill(0) }],
  pickups: 12,
};

const liveStatus: LiveStatus = {
  foreground: app('com.example.video'),
  decision: { decision: 'allow' },
  remaining: [{ ruleId: 'r-daily', minutesLeft: 30 }],
};

const subscription: Subscription = { remove: jest.fn() };

const fake = {
  capabilities: jest.fn((): Capabilities => capabilities),
  getPermissionState: jest.fn((): Promise<PermissionState> => Promise.resolve(permissionState)),
  requestPermission: jest.fn((_p: keyof PermissionState): Promise<void> => Promise.resolve()),
  getInstalledApps: jest.fn((): Promise<InstalledApp[]> => Promise.resolve([installedApp])),
  pickApps: jest.fn((): Promise<AppRef[]> => Promise.resolve([app('com.example.video')])),
  getUsage: jest.fn((_range: DateRange): Promise<UsageDay[]> => Promise.resolve([usageDay])),
  getLiveStatus: jest.fn((): Promise<LiveStatus> => Promise.resolve(liveStatus)),
  setRules: jest.fn((_rules: Rule[]): Promise<void> => Promise.resolve()),
  grantExtraTime: jest.fn(
    (_ref: AppRef, _minutes: number, _source: Grant['source']): Promise<void> => Promise.resolve(),
  ),
  setMode: jest.fn((_mode: 'self' | 'parent' | 'child'): Promise<void> => Promise.resolve()),
  setNativeStrings: jest.fn((_bundle: Record<string, string>): Promise<void> => Promise.resolve()),
  addListener: jest.fn(
    <E extends keyof ScreenGuardEventMap>(
      _event: E,
      _callback: (payload: ScreenGuardEventMap[E]) => void,
    ): Subscription => subscription,
  ),
} satisfies ScreenGuardApi;

describe('ScreenGuardApi contract', () => {
  it('a fake implementation compiles under `satisfies ScreenGuardApi`', () => {
    expect(fake.capabilities()).toEqual(capabilities);
  });

  it('has exactly the 12 §12.2 methods', () => {
    expect(Object.keys(fake).sort()).toEqual(
      [
        'addListener',
        'capabilities',
        'getInstalledApps',
        'getLiveStatus',
        'getPermissionState',
        'getUsage',
        'grantExtraTime',
        'pickApps',
        'requestPermission',
        'setMode',
        'setNativeStrings',
        'setRules',
      ].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Behavior 2: one literal of each Rule subtype is assignable to `Rule`, and a
// `switch` on `rule.type` narrows exhaustively (default assigns to `never`).
// ---------------------------------------------------------------------------

const dailyRule: DailyRule = {
  id: 'r-daily',
  type: 'daily',
  name: 'Video daily limit',
  enabled: true,
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  createdAt: 1790000000000,
  updatedAt: 1790000000000,
  source: 'self',
  targets: [app('com.example.video')],
  minutes: 60,
  perDay: { mon: 30 },
  friction: { kind: 'breathing', extraMinutes: 5, maxPerDay: 3 },
};

const groupRule: GroupRule = {
  id: 'r-group',
  type: 'group',
  name: 'Social + video',
  enabled: true,
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  createdAt: 1790000000000,
  updatedAt: 1790000000000,
  source: 'self',
  category: 'social',
  targets: [app('com.example.video'), app('com.example.social')],
  minutes: 60,
  friction: { kind: 'phrase', extraMinutes: 5, maxPerDay: 3 },
};

const scheduleRule: ScheduleRule = {
  id: 'r-sched',
  type: 'schedule',
  name: 'Bedtime',
  enabled: true,
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  createdAt: 1790000000000,
  updatedAt: 1790000000000,
  source: 'self',
  windows: [{ start: '22:00', end: '07:00' }],
  blockAll: true,
  targets: [],
  allowlist: [],
};

const sessionRule: SessionRule = {
  id: 'r-session',
  type: 'session',
  name: 'Video session',
  enabled: true,
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  createdAt: 1790000000000,
  updatedAt: 1790000000000,
  source: 'self',
  targets: [app('com.example.video')],
  sessionMin: 20,
  breakMin: 10,
};

const openCountRule: OpenCountRule = {
  id: 'r-opens',
  type: 'openCount',
  name: 'Video opens',
  enabled: true,
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  createdAt: 1790000000000,
  updatedAt: 1790000000000,
  source: 'self',
  targets: [app('com.example.video')],
  maxOpens: 5,
};

function describeRule(rule: Rule): string {
  switch (rule.type) {
    case 'daily':
      return `daily:${rule.minutes}`;
    case 'group':
      return `group:${rule.minutes}`;
    case 'schedule':
      return `schedule:${rule.windows.length}`;
    case 'session':
      return `session:${rule.sessionMin}`;
    case 'openCount':
      return `openCount:${rule.maxOpens}`;
    default: {
      const exhaustive: never = rule;
      throw new Error(`Unhandled rule type: ${JSON.stringify(exhaustive)}`);
    }
  }
}

describe('Rule discriminated union', () => {
  it.each<[string, Rule]>([
    ['daily', dailyRule],
    ['group', groupRule],
    ['schedule', scheduleRule],
    ['session', sessionRule],
    ['openCount', openCountRule],
  ])('narrows %s exhaustively via switch(rule.type)', (_label, rule) => {
    expect(() => describeRule(rule)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Behavior 3: a block RuleDecision literal without `untilMs` fails to compile.
// ---------------------------------------------------------------------------

describe('RuleDecision', () => {
  it('a valid block decision carries reason, ruleId and untilMs', () => {
    const decision: RuleDecision = {
      decision: 'block',
      reason: 'daily',
      ruleId: 'r-daily',
      untilMs: 1790668800000,
    };
    expect(decision.untilMs).toBe(1790668800000);
  });

  it('a block decision without untilMs is a compile-time error (see @ts-expect-error below)', () => {
    // @ts-expect-error - untilMs is required on a block decision; this must not compile.
    const invalid: RuleDecision = { decision: 'block', reason: 'daily', ruleId: 'r-daily' };
    expect(invalid.decision).toBe('block');
  });
});
