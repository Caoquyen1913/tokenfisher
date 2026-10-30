#!/usr/bin/env node
'use strict';

// /tokenfisher:set — switches the tokenfisher level for every project (user scope).
//   node bin/set-level.js                 current level and what each level does (JSON)
//   node bin/set-level.js plan <level>    what switching to <level> would change in ~/.claude/settings.json
//   node bin/set-level.js apply <level>   switch: write the level's settings, record them, save the level
//   node bin/set-level.js off             remove every setting tokenfisher wrote and forget the level
// Settings the user set themselves are never overwritten or removed. The file is backed up before every write.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { LEVELS, HOME, current } = require('../lib/level');

const SETTINGS = process.env.TOKENFISHER_SETTINGS || path.join(os.homedir(), '.claude', 'settings.json');
const LEDGER = path.join(HOME, 'set.json'); // { key: value } for every setting tokenfisher wrote
const LEVEL_FILE = path.join(HOME, 'level.json');

function read(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw new Error(`${file} is not valid JSON; fix it first (${e.message})`);
  }
}

function get(obj, key) {
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

function put(obj, key, value) {
  const parts = key.split('.');
  let o = obj;
  for (const p of parts.slice(0, -1)) o = o[p] = o[p] && typeof o[p] === 'object' ? o[p] : {};
  o[parts[parts.length - 1]] = value;
}

function drop(obj, key) {
  const parts = key.split('.');
  const parent = parts.length > 1 ? get(obj, parts.slice(0, -1).join('.')) : obj;
  if (!parent) return;
  delete parent[parts[parts.length - 1]];
  if (parts.length > 1 && !Object.keys(parent).length) drop(obj, parts.slice(0, -1).join('.'));
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// One row per key the switch touches: add, change, remove, keep (already right) or skip (the user's own value).
function plan(target, settings, ledger) {
  const want = target ? LEVELS[target].settings : {};
  const rows = [];
  for (const [key, value] of Object.entries(want)) {
    const now = get(settings, key);
    const ours = key in ledger && same(now, ledger[key]);
    if (same(now, value)) rows.push({ key, value, action: 'keep' });
    else if (now === undefined) rows.push({ key, value, action: 'add' });
    else if (ours) rows.push({ key, from: now, value, action: 'change' });
    else rows.push({ key, current: now, value, action: 'skip (you set your own value)' });
  }
  for (const [key, value] of Object.entries(ledger)) {
    if (key in want) continue;
    if (same(get(settings, key), value)) rows.push({ key, value, action: 'remove' });
  }
  return rows;
}

function write(settings) {
  fs.mkdirSync(HOME, { recursive: true });
  if (fs.existsSync(SETTINGS)) fs.copyFileSync(SETTINGS, path.join(HOME, 'settings.backup.json'));
  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');
}

function apply(target) {
  const settings = read(SETTINGS, {});
  const ledger = read(LEDGER, {});
  const rows = plan(target, settings, ledger);
  for (const r of rows) {
    if (r.action === 'add' || r.action === 'change') { put(settings, r.key, r.value); ledger[r.key] = r.value; }
    if (r.action === 'remove') { drop(settings, r.key); delete ledger[r.key]; }
  }
  for (const key of Object.keys(ledger)) if (!same(get(settings, key), ledger[key])) delete ledger[key];
  if (rows.some((r) => ['add', 'change', 'remove'].includes(r.action))) write(settings);
  fs.mkdirSync(HOME, { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
  if (target) fs.writeFileSync(LEVEL_FILE, JSON.stringify({ level: target }) + '\n');
  else fs.rmSync(LEVEL_FILE, { force: true });
  return { level: target || 'off', settings: SETTINGS, changes: rows };
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  const level = cmd === 'off' ? null : arg;
  if ((cmd === 'plan' || cmd === 'apply') && !LEVELS[level]) {
    throw new Error(`unknown level "${level}"; use one of: ${Object.keys(LEVELS).join(', ')}`);
  }
  let out;
  if (cmd === 'apply' || cmd === 'off') out = apply(level);
  else if (cmd === 'plan') out = { level, settings: SETTINGS, changes: plan(level, read(SETTINGS, {}), read(LEDGER, {})) };
  else out = { current: current(), levels: Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, { summary: v.summary, settings: v.settings, warnTokens: v.warnTokens }])) };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

if (require.main === module) {
  try { main(); } catch (e) { process.stderr.write(e.message + '\n'); process.exitCode = 1; }
}
