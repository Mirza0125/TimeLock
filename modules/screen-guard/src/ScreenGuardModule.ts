import { NativeModule, requireNativeModule } from 'expo';

import type { BlockStrategy } from './blockStrategy';

declare class ScreenGuardModule extends NativeModule<Record<never, never>> {
  getBlockStrategy(): Promise<BlockStrategy>;
  setBlockStrategy(strategy: BlockStrategy): Promise<void>;
}

export default requireNativeModule<ScreenGuardModule>('ScreenGuard');
