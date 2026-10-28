import rawVectorFile from '../modules/screen-guard/shared-test-vectors/rule-evaluation.json';
import {
  parseRuleEvaluationVectorFile,
  REQUIRED_VECTOR_TAGS,
  type RuleEvaluationVectorFile,
} from '../modules/screen-guard/src/ruleEvaluationVectors';
import type { BlockReason } from '../modules/screen-guard/src/ScreenGuard.types';

const BLOCK_REASONS: BlockReason[] = ['schedule', 'daily', 'opens', 'session'];

function clone(): RuleEvaluationVectorFile {
  return JSON.parse(JSON.stringify(rawVectorFile)) as RuleEvaluationVectorFile;
}

function findVector(file: RuleEvaluationVectorFile, id: string) {
  const vector = file.vectors.find((v) => v.id === id);
  if (!vector) throw new Error(`test setup: no vector with id "${id}"`);
  return vector;
}

describe('rule-evaluation.json (the real file)', () => {
  it('parses cleanly and has exactly 21 vectors with unique ids', () => {
    const parsed = parseRuleEvaluationVectorFile(rawVectorFile);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.vectors).toHaveLength(21);
    expect(new Set(parsed.vectors.map((v) => v.id)).size).toBe(21);
  });

  it('covers every entry of REQUIRED_VECTOR_TAGS at least once', () => {
    const parsed = parseRuleEvaluationVectorFile(rawVectorFile);
    const seenTags = new Set(parsed.vectors.flatMap((v) => v.tags));
    for (const tag of REQUIRED_VECTOR_TAGS) {
      expect(seenTags.has(tag)).toBe(true);
    }
  });

  it('covers every BlockReason in at least one expected block', () => {
    const parsed = parseRuleEvaluationVectorFile(rawVectorFile);
    const seenReasons = new Set(
      parsed.vectors
        .map((v) => v.expected)
        .filter((e) => e.decision === 'block')
        .map((e) => (e as { reason: BlockReason }).reason),
    );
    for (const reason of BLOCK_REASONS) {
      expect(seenReasons.has(reason)).toBe(true);
    }
  });

  it('every nowIso and expectedUntilIso equals Date.parse of its paired epoch value', () => {
    const parsed = parseRuleEvaluationVectorFile(rawVectorFile);
    for (const v of parsed.vectors) {
      expect(Date.parse(v.nowIso)).toBe(v.input.nowMs);
      if (v.expected.decision === 'block') {
        expect(v.expectedUntilIso).toBeDefined();
        expect(Date.parse(v.expectedUntilIso as string)).toBe(v.expected.untilMs);
      } else {
        expect(v.expectedUntilIso).toBeUndefined();
      }
    }
  });

  it('has not had any rule evaluator written against it yet (no LimitEngine/evaluate function)', () => {
    // This is enforced by the plan's own acceptance-criteria grep/find commands
    // (no evaluator file, no evaluate/evaluateRules export); this test just
    // documents the invariant for anyone reading the suite.
    expect(rawVectorFile.schemaVersion).toBe(1);
  });
});

describe('parseRuleEvaluationVectorFile validation', () => {
  it('throws naming the offending id for a duplicate id', () => {
    const bad = clone();
    const firstId = bad.vectors[0].id;
    bad.vectors[1].id = firstId;
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(/duplicate vector id/);
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(new RegExp(firstId));
  });

  it('throws for schemaVersion other than 1', () => {
    const bad = clone();
    (bad as unknown as { schemaVersion: number }).schemaVersion = 2;
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(/schemaVersion must be 1/);
  });

  it('throws naming the offending id for an unknown rule type', () => {
    const bad = clone();
    const vector = findVector(bad, 'block-daily-limit-reached');
    (vector.input.rules[0] as unknown as { type: string }).type = 'bogus';
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(/unknown rule type/);
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(new RegExp(vector.id));
  });

  it('throws when an expected block is missing reason, ruleId, or untilMs', () => {
    const badReason = clone();
    delete (findVector(badReason, 'block-daily-limit-reached').expected as Record<string, unknown>)
      .reason;
    expect(() => parseRuleEvaluationVectorFile(badReason)).toThrow(/expected\.reason/);

    const badRuleId = clone();
    delete (findVector(badRuleId, 'block-daily-limit-reached').expected as Record<string, unknown>)
      .ruleId;
    expect(() => parseRuleEvaluationVectorFile(badRuleId)).toThrow(/expected\.ruleId/);

    const badUntilMs = clone();
    delete (findVector(badUntilMs, 'block-daily-limit-reached').expected as Record<string, unknown>)
      .untilMs;
    expect(() => parseRuleEvaluationVectorFile(badUntilMs)).toThrow(/expected\.untilMs/);
  });

  it('throws when nowIso !== new Date(nowMs).toISOString()', () => {
    const bad = clone();
    findVector(bad, 'allow-no-rules').nowIso = '2000-01-01T00:00:00.000Z';
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(/nowIso/);
  });

  it('throws when a block is missing expectedUntilIso', () => {
    const bad = clone();
    delete findVector(bad, 'block-daily-limit-reached').expectedUntilIso;
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(/expectedUntilIso/);
  });

  it('throws when expectedUntilIso does not match expected.untilMs', () => {
    const bad = clone();
    findVector(bad, 'block-daily-limit-reached').expectedUntilIso = '2000-01-01T00:00:00.000Z';
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(/expectedUntilIso/);
  });

  it('throws when an allow decision carries expectedUntilIso', () => {
    const bad = clone();
    findVector(bad, 'allow-no-rules').expectedUntilIso = '2026-09-29T00:00:00.000Z';
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(
      /must not be set when expected\.decision is "allow"/,
    );
  });

  it('throws when an AppRef has a platform other than android/ios', () => {
    const bad = clone();
    (
      findVector(bad, 'allow-no-rules').input.foreground as unknown as { platform: string }
    ).platform = 'windows';
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(/platform/);
  });

  it('throws when an AppRef has an empty id', () => {
    const bad = clone();
    findVector(bad, 'allow-no-rules').input.foreground.id = '';
    expect(() => parseRuleEvaluationVectorFile(bad)).toThrow(/non-empty string/);
  });
});
