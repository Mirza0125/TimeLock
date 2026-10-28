/**
 * Types and runtime validator for the shared rule-evaluation vectors
 * (modules/screen-guard/shared-test-vectors/rule-evaluation.json).
 *
 * This file does NOT compute rule decisions — it only validates vector
 * shape and internal consistency. No evaluator (TS or Kotlin) exists yet;
 * both the Phase 2/4 TS reference evaluator and the Kotlin `LimitEngine`
 * will be written and cross-checked against these vectors.
 *
 * The JSON file is read by two harnesses today (Jest here, JUnit in Plan
 * 01-06) and by two evaluators later, so this validator is the shared
 * contract that keeps a malformed vector from silently misleading either
 * side (see PLAN 01-03 threat T-01-07).
 */

import type { BlockReason, RuleEvaluationInput, RuleType } from './ScreenGuard.types';

/** One shared rule-evaluation test case, cross-checked by TS and Kotlin. */
export interface RuleEvaluationVector {
  id: string;
  description: string;
  /** Which spec §6.3 step (or steps) this vector exercises, e.g. "§6.3 step 3". */
  specRef: string;
  tags: string[];
  /** Must equal `new Date(input.nowMs).toISOString()`. */
  nowIso: string;
  input: RuleEvaluationInput;
  expected:
    | { decision: 'allow' }
    | { decision: 'block'; reason: BlockReason; ruleId: string; untilMs: number };
  /** Required iff `expected.decision === 'block'`; must equal `new Date(expected.untilMs).toISOString()`. */
  expectedUntilIso?: string;
}

/** The on-disk vector file shape. */
export interface RuleEvaluationVectorFile {
  schemaVersion: 1;
  description: string;
  vectors: RuleEvaluationVector[];
}

/**
 * Every tag that must appear on at least one vector in the file, one per
 * §6.3 evaluation step (a step with a boundary case gets 2 vectors sharing
 * one tag, e.g. "schedule-midnight" covers both sides of the midnight
 * crossing).
 */
export const REQUIRED_VECTOR_TAGS: readonly string[] = [
  'baseline',
  'allowlist',
  'daily-under',
  'daily',
  'disabled',
  'days',
  'per-day',
  'group',
  'schedule',
  'schedule-midnight',
  'schedule-allowlist',
  'schedule-outside',
  'opens-boundary',
  'opens',
  'session-boundary',
  'session',
  'grant',
  'grant-expired',
  'grant-schedule-child',
  'precedence',
];

const RULE_TYPES: readonly RuleType[] = ['daily', 'group', 'schedule', 'session', 'openCount'];
const BLOCK_REASONS: readonly BlockReason[] = ['schedule', 'daily', 'opens', 'session'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Throws with the offending vector id and field, per the shared validator contract. */
function fail(id: string, field: string, message: string): never {
  throw new Error(`rule-evaluation vector "${id}": ${field} — ${message}`);
}

function validateAppRef(ref: unknown, id: string, field: string): void {
  if (!isPlainObject(ref)) {
    fail(id, field, 'AppRef must be an object');
  }
  const platform = ref.platform;
  const refId = ref.id;
  if (platform !== 'android' && platform !== 'ios') {
    fail(id, `${field}.platform`, `must be "android" or "ios", got ${JSON.stringify(platform)}`);
  }
  if (typeof refId !== 'string' || refId.length === 0) {
    fail(id, `${field}.id`, `must be a non-empty string, got ${JSON.stringify(refId)}`);
  }
}

function validateAppRefArray(refs: unknown, id: string, field: string): void {
  if (!Array.isArray(refs)) {
    fail(id, field, 'must be an array of AppRef');
  }
  refs.forEach((ref, i) => validateAppRef(ref, id, `${field}[${i}]`));
}

function validateRule(rule: unknown, id: string, field: string): void {
  if (!isPlainObject(rule)) {
    fail(id, field, 'must be an object');
  }
  const type = rule.type;
  if (!RULE_TYPES.includes(type as RuleType)) {
    fail(id, `${field}.type`, `unknown rule type ${JSON.stringify(type)}`);
  }
  if ('targets' in rule) {
    validateAppRefArray(rule.targets, id, `${field}.targets`);
  }
  if ('allowlist' in rule) {
    validateAppRefArray(rule.allowlist, id, `${field}.allowlist`);
  }
}

/**
 * Validates and returns a typed `RuleEvaluationVectorFile`. Throws an Error
 * naming the offending vector id and field for any structural or
 * internal-consistency violation (duplicate id, wrong schemaVersion, unknown
 * rule type, a block missing reason/ruleId/untilMs, a `nowIso`/`nowMs`
 * mismatch, a missing or mismatched `expectedUntilIso`, an `allow` carrying
 * `expectedUntilIso`, or a malformed AppRef).
 */
export function parseRuleEvaluationVectorFile(json: unknown): RuleEvaluationVectorFile {
  if (!isPlainObject(json)) {
    throw new Error('rule-evaluation vector file: must be an object');
  }

  const schemaVersion = json.schemaVersion;
  if (schemaVersion !== 1) {
    throw new Error(
      `rule-evaluation vector file: schemaVersion must be 1, got ${JSON.stringify(schemaVersion)}`,
    );
  }

  const description = json.description;
  if (typeof description !== 'string') {
    throw new Error('rule-evaluation vector file: description must be a string');
  }

  const rawVectors = json.vectors;
  if (!Array.isArray(rawVectors)) {
    throw new Error('rule-evaluation vector file: vectors must be an array');
  }

  const seenIds = new Set<string>();
  const seenTags = new Set<string>();
  const seenReasons = new Set<BlockReason>();

  const vectors: RuleEvaluationVector[] = rawVectors.map((raw, index) => {
    if (!isPlainObject(raw)) {
      throw new Error(`rule-evaluation vector file: vectors[${index}] must be an object`);
    }

    const id = raw.id;
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error(
        `rule-evaluation vector file: vectors[${index}].id must be a non-empty string`,
      );
    }
    if (seenIds.has(id)) {
      fail(id, 'id', 'duplicate vector id');
    }
    seenIds.add(id);

    if (typeof raw.description !== 'string') fail(id, 'description', 'must be a string');
    if (typeof raw.specRef !== 'string') fail(id, 'specRef', 'must be a string');

    const tags = raw.tags;
    if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
      fail(id, 'tags', 'must be an array of strings');
    }
    (tags as string[]).forEach((t) => seenTags.add(t));

    const nowIso = raw.nowIso;
    if (typeof nowIso !== 'string') fail(id, 'nowIso', 'must be a string');

    const input = raw.input;
    if (!isPlainObject(input)) fail(id, 'input', 'must be an object');

    const nowMs = input.nowMs;
    if (typeof nowMs !== 'number') fail(id, 'input.nowMs', 'must be a number');
    const expectedNowIso = new Date(nowMs).toISOString();
    if (nowIso !== expectedNowIso) {
      fail(
        id,
        'nowIso',
        `must equal new Date(input.nowMs).toISOString() (expected ${expectedNowIso}, got ${nowIso})`,
      );
    }

    const timeZone = input.timeZone;
    if (typeof timeZone !== 'string') fail(id, 'input.timeZone', 'must be a string');

    const mode = input.mode;
    if (mode !== 'self' && mode !== 'child') {
      fail(id, 'input.mode', `must be "self" or "child", got ${JSON.stringify(mode)}`);
    }

    validateAppRef(input.foreground, id, 'input.foreground');
    validateAppRefArray(input.globalAllowlist, id, 'input.globalAllowlist');

    const rules = input.rules;
    if (!Array.isArray(rules)) fail(id, 'input.rules', 'must be an array');
    rules.forEach((rule, i) => validateRule(rule, id, `input.rules[${i}]`));

    const usageToday = input.usageToday;
    if (!Array.isArray(usageToday)) fail(id, 'input.usageToday', 'must be an array');
    usageToday.forEach((u, i) => {
      if (!isPlainObject(u)) fail(id, `input.usageToday[${i}]`, 'must be an object');
      validateAppRef(u.ref, id, `input.usageToday[${i}].ref`);
      if (typeof u.minutes !== 'number') {
        fail(id, `input.usageToday[${i}].minutes`, 'must be a number');
      }
      if (typeof u.opens !== 'number') {
        fail(id, `input.usageToday[${i}].opens`, 'must be a number');
      }
    });

    const continuousUseMinutes = input.continuousUseMinutes;
    if (typeof continuousUseMinutes !== 'number') {
      fail(id, 'input.continuousUseMinutes', 'must be a number');
    }

    const grants = input.grants;
    if (!Array.isArray(grants)) fail(id, 'input.grants', 'must be an array');
    grants.forEach((g, i) => {
      if (!isPlainObject(g)) fail(id, `input.grants[${i}]`, 'must be an object');
      validateAppRef(g.target, id, `input.grants[${i}].target`);
    });

    const expected = raw.expected;
    if (!isPlainObject(expected)) fail(id, 'expected', 'must be an object');
    const decision = expected.decision;
    if (decision !== 'allow' && decision !== 'block') {
      fail(id, 'expected.decision', `must be "allow" or "block", got ${JSON.stringify(decision)}`);
    }

    const expectedUntilIso = raw.expectedUntilIso;

    if (decision === 'block') {
      const reason = expected.reason;
      const ruleId = expected.ruleId;
      const untilMs = expected.untilMs;
      if (!BLOCK_REASONS.includes(reason as BlockReason)) {
        fail(
          id,
          'expected.reason',
          `must be one of ${BLOCK_REASONS.join(', ')}, got ${JSON.stringify(reason)}`,
        );
      }
      if (typeof ruleId !== 'string' || ruleId.length === 0) {
        fail(id, 'expected.ruleId', 'must be a non-empty string');
      }
      if (typeof untilMs !== 'number') {
        fail(id, 'expected.untilMs', 'must be a number');
      }
      if (typeof expectedUntilIso !== 'string') {
        fail(id, 'expectedUntilIso', 'is required when expected.decision is "block"');
      }
      const expectedIso = new Date(untilMs as number).toISOString();
      if (expectedUntilIso !== expectedIso) {
        fail(
          id,
          'expectedUntilIso',
          `must equal new Date(expected.untilMs).toISOString() (expected ${expectedIso}, got ${expectedUntilIso})`,
        );
      }
      seenReasons.add(reason as BlockReason);
    } else if (expectedUntilIso !== undefined) {
      fail(id, 'expectedUntilIso', 'must not be set when expected.decision is "allow"');
    }

    return raw as unknown as RuleEvaluationVector;
  });

  for (const tag of REQUIRED_VECTOR_TAGS) {
    if (!seenTags.has(tag)) {
      throw new Error(`rule-evaluation vector file: no vector covers required tag "${tag}"`);
    }
  }
  for (const reason of BLOCK_REASONS) {
    if (!seenReasons.has(reason)) {
      throw new Error(`rule-evaluation vector file: no block vector covers reason "${reason}"`);
    }
  }

  return { schemaVersion: 1, description, vectors };
}
