// eslint.config.js
//
// Flat config (ESLint 9+). Spreads the Expo SDK 57 baseline
// (eslint-config-expo/flat) and adds an RTL-safety rule that bans
// left/right-family style properties and JSX props, per PRODUCT_SPEC.md
// section 11 (Urdu/RTL requirement, Phase 6). Violations point developers at
// the logical (start/end) equivalents instead.
//
// scripts/check-rtl-lint-rule.mjs self-tests this rule on every `pnpm lint`
// run so a config regression (e.g. the flat config silently not being
// picked up) cannot go unnoticed — see 01-RESEARCH.md Pitfall 4.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const RTL_PROPERTY_NAMES =
  '^(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)$';

const RTL_MESSAGE =
  'Use logical style props (start/end, e.g. marginStart/End, paddingStart/End) instead of left/right — RTL support for Urdu (PRODUCT_SPEC.md section 11).';

module.exports = defineConfig([
  {
    ignores: [
      'android/**',
      'ios/**',
      '.expo/**',
      'node_modules/**',
      '.planning/**',
      'modules/*/android/**',
      'coverage/**',
    ],
  },
  ...expoConfig,
  {
    files: [
      'app/**/*.{ts,tsx}',
      'src/**/*.{ts,tsx}',
      'modules/*/src/**/*.{ts,tsx}',
      'modules/*/index.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Property[key.name=/${RTL_PROPERTY_NAMES}/]`,
          message: RTL_MESSAGE,
        },
        {
          selector: `Property[key.value=/${RTL_PROPERTY_NAMES}/]`,
          message: RTL_MESSAGE,
        },
        {
          selector: "Property[key.name='textAlign'][value.value=/^(left|right)$/]",
          message: RTL_MESSAGE,
        },
        {
          selector: 'JSXAttribute[name.name=/^(left|right)$/]',
          message: RTL_MESSAGE,
        },
      ],
    },
  },
]);
