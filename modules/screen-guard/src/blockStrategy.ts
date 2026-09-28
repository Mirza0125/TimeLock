/**
 * The block-launch strategy ScreenGuard uses when it detects a blocked app in
 * the foreground. Wire names cross the JS <-> Kotlin boundary verbatim and
 * must exactly match `expo.modules.screenguard.BlockStrategy` on the native
 * side (modules/screen-guard/android/.../BlockStrategyStore.kt).
 */
export type BlockStrategy = 'off' | 'activityFirst' | 'homeNotification';

export const BLOCK_STRATEGIES: readonly BlockStrategy[] = [
  'off',
  'activityFirst',
  'homeNotification',
];

export function isBlockStrategy(value: unknown): value is BlockStrategy {
  return typeof value === 'string' && (BLOCK_STRATEGIES as readonly string[]).includes(value);
}

export const BLOCK_STRATEGY_LABELS: Record<BlockStrategy, string> = {
  off: 'Off',
  activityFirst: 'Activity first',
  homeNotification: 'Home + notification',
};
