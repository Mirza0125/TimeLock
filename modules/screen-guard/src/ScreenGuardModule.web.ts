import { registerWebModule, NativeModule } from 'expo';

// ScreenGuardModule is not available on the web platform.
class ScreenGuardModule extends NativeModule<{}> {}

export default registerWebModule(ScreenGuardModule, 'ScreenGuardModule');
