#!/usr/bin/env node
// scripts/emu-ui.mjs
//
// uiautomator-based wait/tap/dump helper for emulator E2E scripts. No
// dependencies beyond Node's built-ins.
//
// Usage:
//   node scripts/emu-ui.mjs dump
//   node scripts/emu-ui.mjs wait <selector> [timeoutMs=15000]
//   node scripts/emu-ui.mjs tap <selector> [timeoutMs=15000]
//
// Selectors:
//   id:<testID>    matches a node whose resource-id equals <testID> or ends
//                   with "/<testID>" (React Native maps testID to the
//                   Android resource-id)
//   text:<substr>  matches a node whose text contains <substr>
//   desc:<substr>  matches a node whose content-desc contains <substr>
//
// Exit codes: 0 found/tapped, 1 not found, 2 usage/adb error.

import { execFileSync } from 'node:child_process';

const ANDROID_SERIAL = process.env.ANDROID_SERIAL || 'emulator-5554';
const DUMP_PATH = '/sdcard/sl-ui.xml';
const RETRY_INTERVAL_MS = 700;

function adb(args) {
  return execFileSync('adb', ['-s', ANDROID_SERIAL, ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
  });
}

function dumpUiTree() {
  try {
    adb(['shell', 'uiautomator', 'dump', DUMP_PATH]);
    return adb(['exec-out', 'cat', DUMP_PATH]);
  } catch (_err) {
    // uiautomator dump can transiently fail with "could not get idle state"
    // while the screen animates. Surface null so the caller retries.
    return null;
  }
}

function parseNodes(xml) {
  const nodes = [];
  // Match the opening tag of every <node>, whether self-closing (a leaf,
  // "<node .../>") or a parent with children ("<node ...>...</node>", e.g.
  // a Button that wraps its label TextView). Matching only self-closing tags
  // would silently skip every parent node - including exactly the kind of
  // clickable container (React Native Pressable/Button) that carries the
  // testID/resource-id this script needs to tap.
  const nodeRegex = /<node\b[^>]*>/g;
  const attrRegex = /(\w[\w-]*)="((?:[^"\\]|\\.)*)"/g;
  const matches = xml.match(nodeRegex) || [];
  for (const raw of matches) {
    const attrs = {};
    let m;
    attrRegex.lastIndex = 0;
    while ((m = attrRegex.exec(raw)) !== null) {
      attrs[m[1]] = m[2]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    }
    nodes.push({
      text: attrs.text || '',
      resourceId: attrs['resource-id'] || '',
      contentDesc: attrs['content-desc'] || '',
      bounds: attrs.bounds || '',
    });
  }
  return nodes;
}

function parseSelector(selector) {
  const idx = selector.indexOf(':');
  if (idx === -1) {
    return null;
  }
  const kind = selector.slice(0, idx);
  const value = selector.slice(idx + 1);
  if (!['id', 'text', 'desc'].includes(kind) || value.length === 0) {
    return null;
  }
  return { kind, value };
}

function nodeMatches(node, sel) {
  if (sel.kind === 'id') {
    return node.resourceId === sel.value || node.resourceId.endsWith(`/${sel.value}`);
  }
  if (sel.kind === 'text') {
    return node.text.includes(sel.value);
  }
  if (sel.kind === 'desc') {
    return node.contentDesc.includes(sel.value);
  }
  return false;
}

function parseBoundsCenter(bounds) {
  const m = bounds.match(/\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/);
  if (!m) return null;
  const [, x1, y1, x2, y2] = m.map(Number);
  return { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };
}

function findMatch(sel) {
  const xml = dumpUiTree();
  if (xml === null) {
    return { xml: null, nodes: [], match: null };
  }
  const nodes = parseNodes(xml);
  const match = nodes.find((n) => nodeMatches(n, sel)) || null;
  return { xml, nodes, match };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printVisible(nodes) {
  const texts = nodes.map((n) => n.text).filter(Boolean);
  const ids = nodes.map((n) => n.resourceId).filter(Boolean);
  console.error('Visible texts:', JSON.stringify(texts));
  console.error('Visible resource-ids:', JSON.stringify(ids));
}

async function cmdDump() {
  const xml = dumpUiTree();
  if (xml === null) {
    console.error('adb/uiautomator dump failed');
    process.exit(2);
  }
  console.log(xml);
  process.exit(0);
}

async function cmdWait(selectorArg, timeoutArg) {
  const sel = parseSelector(selectorArg);
  if (!sel) {
    console.error(
      `Invalid selector: ${selectorArg}. Expected id:<testID> | text:<substring> | desc:<substring>`,
    );
    process.exit(2);
  }
  const timeoutMs = timeoutArg ? Number(timeoutArg) : 15000;
  const deadline = Date.now() + timeoutMs;
  let lastNodes = [];
  while (Date.now() < deadline) {
    const { nodes, match } = findMatch(sel);
    lastNodes = nodes;
    if (match) {
      console.log(`FOUND ${selectorArg}`);
      process.exit(0);
    }
    await sleep(RETRY_INTERVAL_MS);
  }
  console.error(`Not found within ${timeoutMs}ms: ${selectorArg}`);
  printVisible(lastNodes);
  process.exit(1);
}

async function cmdTap(selectorArg, timeoutArg) {
  const sel = parseSelector(selectorArg);
  if (!sel) {
    console.error(
      `Invalid selector: ${selectorArg}. Expected id:<testID> | text:<substring> | desc:<substring>`,
    );
    process.exit(2);
  }
  const timeoutMs = timeoutArg ? Number(timeoutArg) : 15000;
  const deadline = Date.now() + timeoutMs;
  let lastNodes = [];
  while (Date.now() < deadline) {
    const { nodes, match } = findMatch(sel);
    lastNodes = nodes;
    if (match) {
      const center = parseBoundsCenter(match.bounds);
      if (!center) {
        console.error(`Matched node has unparsable bounds: ${match.bounds}`);
        process.exit(2);
      }
      try {
        adb(['shell', 'input', 'tap', String(center.x), String(center.y)]);
      } catch (err) {
        console.error(`adb tap failed: ${err.message}`);
        process.exit(2);
      }
      console.log(`TAPPED ${selectorArg} at (${center.x},${center.y})`);
      process.exit(0);
    }
    await sleep(RETRY_INTERVAL_MS);
  }
  console.error(`Not found within ${timeoutMs}ms: ${selectorArg}`);
  printVisible(lastNodes);
  process.exit(1);
}

async function main() {
  const [, , command, arg1, arg2] = process.argv;
  if (command === 'dump') {
    await cmdDump();
  } else if (command === 'wait') {
    if (!arg1) {
      console.error('Usage: emu-ui.mjs wait <selector> [timeoutMs]');
      process.exit(2);
    }
    await cmdWait(arg1, arg2);
  } else if (command === 'tap') {
    if (!arg1) {
      console.error('Usage: emu-ui.mjs tap <selector> [timeoutMs]');
      process.exit(2);
    }
    await cmdTap(arg1, arg2);
  } else {
    console.error('Usage: emu-ui.mjs dump|wait <selector> [timeoutMs]|tap <selector> [timeoutMs]');
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(2);
});
