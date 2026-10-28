// Re-export the native module. On web, it will be resolved to ScreenGuardModule.web.ts
// and on native platforms to ScreenGuardModule.ts
export { default } from './src/ScreenGuardModule';
export * from './src/ScreenGuard.types';
export * from './src/blockStrategy';
