#!/usr/bin/env node
// scripts/check-rtl-lint-rule.mjs
//
// Self-test for the RTL `no-restricted-syntax` rule in eslint.config.js.
// Proves the rule actually fires on left/right-family violations and stays
// silent on the logical (start/end) equivalents. Runs as part of `pnpm lint`
// so a config regression (e.g. the flat config silently not being picked
// up, or the rule's `files` glob missing the probe path) cannot go
// unnoticed — see 01-RESEARCH.md Pitfall 4.
//
// Exit codes: 0 (all probes behave as expected, prints RTL_RULE_OK), 1
// (a probe failed, details printed).

import { ESLint } from 'eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// The virtual file path below is inside the RTL rule's `files` scope
// (app/**/*.{ts,tsx}), so no fixture file is written to disk — lintText
// evaluates the code as if it lived at that path.
const PROBE_FILE_PATH = 'app/__rtl_rule_probe__.tsx';

const VIOLATION_PROBES = [
  {
    name: 'style object: left',
    code: `const s = { left: 4 };`,
  },
  {
    name: 'style object: marginRight',
    code: `const s = { marginRight: 8 };`,
  },
  {
    name: 'StyleSheet.create: paddingLeft',
    code: `import { StyleSheet } from 'react-native';
const s = StyleSheet.create({ box: { paddingLeft: 2 } });`,
  },
  {
    name: 'textAlign: right',
    code: `const s = { textAlign: 'right' };`,
  },
  {
    name: 'JSX attribute: left',
    code: `function C() { return <View left={3} />; }`,
  },
];

const CLEAN_PROBE = {
  name: 'logical props (start/end) stay clean',
  code: `import { StyleSheet } from 'react-native';
const s = StyleSheet.create({
  box: { start: 4, marginEnd: 8, paddingStart: 2, borderEndWidth: 1, textAlign: 'center' },
});`,
};

async function lintCode(eslint, code) {
  const results = await eslint.lintText(code, { filePath: PROBE_FILE_PATH });
  const messages = results[0]?.messages ?? [];
  return messages.filter((m) => m.ruleId === 'no-restricted-syntax');
}

async function main() {
  const eslint = new ESLint({ cwd: REPO_ROOT });
  const failures = [];

  for (const probe of VIOLATION_PROBES) {
    const matches = await lintCode(eslint, probe.code);
    if (matches.length === 0) {
      failures.push(`FAIL (expected violation, got none): ${probe.name}`);
    } else {
      console.log(`OK (violation caught): ${probe.name}`);
    }
  }

  const cleanMatches = await lintCode(eslint, CLEAN_PROBE.code);
  if (cleanMatches.length > 0) {
    failures.push(
      `FAIL (expected clean, got ${cleanMatches.length} violation(s)): ${CLEAN_PROBE.name} -> ${JSON.stringify(
        cleanMatches.map((m) => m.message),
      )}`,
    );
  } else {
    console.log(`OK (stayed clean): ${CLEAN_PROBE.name}`);
  }

  if (failures.length > 0) {
    console.error('\nRTL rule self-test FAILED:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log('RTL_RULE_OK');
}

main().catch((err) => {
  console.error('RTL rule self-test crashed:', err);
  process.exit(1);
});
