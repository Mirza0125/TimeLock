import {
  BLOCK_STRATEGIES,
  BLOCK_STRATEGY_LABELS,
  isBlockStrategy,
} from '../modules/screen-guard/src/blockStrategy';

describe('BLOCK_STRATEGIES', () => {
  it('equals exactly the three wire-name strategies, in order', () => {
    expect(BLOCK_STRATEGIES).toEqual(['off', 'activityFirst', 'homeNotification']);
  });
});

describe('isBlockStrategy', () => {
  it.each(BLOCK_STRATEGIES)('is true for %s', (value) => {
    expect(isBlockStrategy(value)).toBe(true);
  });

  it.each([['ON'], [''], [null], [undefined], [42], [{}]])('is false for %p', (value) => {
    expect(isBlockStrategy(value)).toBe(false);
  });
});

describe('BLOCK_STRATEGY_LABELS', () => {
  it.each(BLOCK_STRATEGIES)('has a non-empty label for %s', (strategy) => {
    expect(typeof BLOCK_STRATEGY_LABELS[strategy]).toBe('string');
    expect(BLOCK_STRATEGY_LABELS[strategy].length).toBeGreaterThan(0);
  });
});
