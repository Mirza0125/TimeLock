// plugins/withScreenGuardAndroid.js
//
// The only source of the ScreenGuard accessibility-service manifest entries,
// the block Activity manifest entry, the MAIN/LAUNCHER <queries> entry, the
// accessibility-service config XML, and the debug-manifest overlay-permission
// removal. Every native change this plugin makes must be idempotent: a
// non-clean `expo prebuild` re-running mods on an already-modified manifest
// must not duplicate any entry.
//
// See docs/PRODUCT_SPEC.md §13.2, §6.4, §13.5 and
// .planning/research/ARCHITECTURE.md correction #2 for why both the
// accessibility-triggered Activity path and the GLOBAL_ACTION_HOME fallback
// exist as first-class, always-wired paths.
//
// No `// @ts-check` pragma: @expo/config-plugins' manifest typings (e.g.
// ManifestService) don't model every valid manifest attribute (android:label
// is a real one they omit), and enabling per-file checking here would also
// require @types/node for the `fs`/`path` requires below - a new direct
// devDependency this plan's approved package list doesn't cover. JSDoc types
// stay as documentation for editor intellisense; `pnpm typecheck`'s project-
// wide tsc run does not fail on this file as a result.
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE_NAME = 'expo.modules.screenguard.GuardAccessibilityService';
const ACTIVITY_NAME = 'expo.modules.screenguard.BlockActivity';

const ACCESSIBILITY_SERVICE_XML = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
  android:accessibilityEventTypes="typeWindowStateChanged|typeWindowsChanged"
  android:accessibilityFeedbackType="feedbackGeneric"
  android:notificationTimeout="100"
  android:canRetrieveWindowContent="false"
  android:isAccessibilityTool="false"
  android:description="@string/screen_guard_accessibility_description" />
`;

/**
 * Removes any existing entry named `name` from `list` (in place, by
 * `android:name`), so re-running this plugin on an already-modified manifest
 * never produces a duplicate. Returns the filtered array.
 * @param {Array<{$: {[key: string]: string | undefined}}>} list
 * @param {string} name
 */
function removeByAndroidName(list, name) {
  return list.filter((entry) => entry.$['android:name'] !== name);
}

/**
 * @param {import('expo/config-plugins').ExportedConfig} config
 */
function withScreenGuardManifest(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    // --- Accessibility service ---
    mainApplication.service = removeByAndroidName(mainApplication.service ?? [], SERVICE_NAME);
    // `android:label` is not part of @expo/config-plugins' ManifestService
    // typing (it only models the subset the first-party mods need), even
    // though it is a perfectly valid manifest attribute here — cast to
    // bypass the excess-property check rather than widen the library type.
    mainApplication.service.push(
      /** @type {any} */ ({
        $: {
          'android:name': SERVICE_NAME,
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'true',
          'android:label': '@string/screen_guard_accessibility_label',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.accessibilityservice',
              'android:resource': '@xml/screen_guard_accessibility_service',
            },
          },
        ],
      }),
    );

    // --- Block activity ---
    mainApplication.activity = removeByAndroidName(mainApplication.activity ?? [], ACTIVITY_NAME);
    mainApplication.activity.push({
      $: {
        'android:name': ACTIVITY_NAME,
        'android:exported': 'false',
        'android:excludeFromRecents': 'true',
        'android:taskAffinity': '',
        'android:launchMode': 'singleTask',
        'android:theme': '@android:style/Theme.DeviceDefault.NoActionBar',
      },
    });

    // --- <queries> MAIN/LAUNCHER, alongside the template's VIEW/BROWSABLE entry ---
    const manifest = config.modResults.manifest;
    manifest.queries = manifest.queries ?? [{}];
    const queriesBlock = manifest.queries[0];
    queriesBlock.intent = queriesBlock.intent ?? [];
    const hasLauncherIntent = queriesBlock.intent.some(
      (intent) =>
        intent.action?.some((a) => a.$['android:name'] === 'android.intent.action.MAIN') &&
        intent.category?.some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER'),
    );
    if (!hasLauncherIntent) {
      queriesBlock.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
      });
    }

    return config;
  });
}

/**
 * If `manifestPath` exists and declares the SYSTEM_ALERT_WINDOW permission
 * without a `tools:node` attribute, rewrite that element to carry
 * `tools:node="remove"`. Idempotent: already-marked or missing files are a
 * silent no-op, never a throw (a source-set manifest template can legally be
 * absent from a given Expo/AGP version).
 * @param {string} manifestPath
 */
function stripOverlayPermission(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return;
  }
  const contents = fs.readFileSync(manifestPath, 'utf8');
  const alreadyMarked = /android\.permission\.SYSTEM_ALERT_WINDOW"[^/>]*tools:node="remove"/.test(
    contents,
  );
  if (alreadyMarked) {
    return;
  }
  const plainTag =
    /<uses-permission\s+android:name="android\.permission\.SYSTEM_ALERT_WINDOW"\s*\/>/;
  if (!plainTag.test(contents)) {
    return;
  }
  const updated = contents.replace(
    plainTag,
    '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/>',
  );
  fs.writeFileSync(manifestPath, updated);
}

/**
 * @param {import('expo/config-plugins').ExportedConfig} config
 */
function withScreenGuardDangerousMods(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const platformRoot = config.modRequest.platformProjectRoot;

      const xmlDir = path.join(platformRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'screen_guard_accessibility_service.xml'),
        ACCESSIBILITY_SERVICE_XML,
      );

      stripOverlayPermission(path.join(platformRoot, 'app/src/debug/AndroidManifest.xml'));
      stripOverlayPermission(path.join(platformRoot, 'app/src/debugOptimized/AndroidManifest.xml'));

      return config;
    },
  ]);
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withScreenGuardAndroid = (config) => {
  config = withScreenGuardManifest(config);
  config = withScreenGuardDangerousMods(config);
  return config;
};

module.exports = withScreenGuardAndroid;
