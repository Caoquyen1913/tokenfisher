#!/usr/bin/env node
'use strict';

// Copies an A/B results dir into a shareable evidence folder:
// node eval/publish.js <results dir> [out dir, default evidence/<name>]
// - drops each transcript's `system/init` record (it lists your MCP servers and connectors)
//   and its `rate_limit_event` records (your plan's usage windows)
// - replaces your home directory with `~` and the account name with `user`
// - masks email addresses
// Fails if the account name still appears anywhere afterwards.

const fs = require('fs');
const os = require('os');
const path = require('path');

const [src, outArg] = process.argv.slice(2);
if (!src) {
  console.log('node eval/publish.js <results dir> [out dir]');
  process.exit(1);
}
const out = outArg || path.join(__dirname, '..', 'evidence', path.basename(path.resolve(src)));
const home = os.homedir();
const account = os.userInfo().username;

const homeVariants = [
  home.replace(/\\/g, '\\\\'),                 // JSON-escaped C:\\Users\\name
  home,                                         // C:\Users\name
  home.replace(/\\/g, '/'),                     // C:/Users/name
  home.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`), // /c/Users/name
];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sanitize(text) {
  let t = text;
  for (const v of homeVariants) t = t.replace(new RegExp(escapeRe(v), 'gi'), '~');
  t = t.replace(new RegExp(`\\b${escapeRe(account)}\\b`, 'gi'), 'user');
  return t.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<email>');
}

function copy(rel, transform = (x) => x) {
  const from = path.join(src, rel);
  if (!fs.existsSync(from)) return;
  const to = path.join(out, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, sanitize(transform(fs.readFileSync(from, 'utf8'))));
}

// init lists your MCP servers/connectors; rate_limit_event carries your plan's usage windows.
const dropPrivate = (text) => text.split('\n')
  .filter((l) => {
    try {
      const o = JSON.parse(l);
      return !(o.type === 'system' && o.subtype === 'init') && o.type !== 'rate_limit_event';
    } catch { return l.trim() !== ''; }
  })
  .join('\n') + '\n';

fs.rmSync(out, { recursive: true, force: true });
for (const f of ['REPORT.md', 'summary.json', 'runs.jsonl', 'config.json']) copy(f);
for (const run of fs.readdirSync(path.join(src, 'runs'))) {
  for (const f of ['result.json', 'grade.json', 'changes.diff']) copy(path.join('runs', run, f));
  copy(path.join('runs', run, 'transcript.jsonl'), dropPrivate);
  const td = path.join(src, 'runs', run, 'tokenfisher');
  if (fs.existsSync(td)) for (const f of fs.readdirSync(td, { recursive: true })) {
    if (fs.statSync(path.join(td, f)).isFile()) copy(path.join('runs', run, 'tokenfisher', f));
  }
}

const leaks = [];
for (const f of fs.readdirSync(out, { recursive: true })) {
  const p = path.join(out, f);
  if (fs.statSync(p).isFile() && new RegExp(`\\b${escapeRe(account)}\\b`, 'i').test(fs.readFileSync(p, 'utf8'))) leaks.push(f);
}
if (leaks.length) {
  console.error(`Account name still present in: ${leaks.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Evidence written to ${out}`);
}
