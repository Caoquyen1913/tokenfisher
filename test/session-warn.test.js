'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { lastRequest, levelFor, check } = require('../bin/session-warn');

const HOOK = path.join(__dirname, '..', 'bin', 'session-warn.js');
const MIN = 60e3;

function assistant(id, ts, usage) {
  return JSON.stringify({ type: 'assistant', timestamp: ts, message: { id, model: 'claude-opus-5-5', usage } });
}

function transcript(lines) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'session-warn-')), 's1.jsonl');
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
}

test('levels: 0 below the threshold, then one per +40k', () => {
  assert.equal(levelFor(79999, 80000), 0);
  assert.equal(levelFor(80000, 80000), 1);
  assert.equal(levelFor(119999, 80000), 1);
  assert.equal(levelFor(120000, 80000), 2);
  assert.equal(levelFor(200000, 80000), 4);
  assert.equal(levelFor(500000, 0), 0); // threshold 0 disables
});

test('size warning fires once per crossing and re-arms after the context shrinks', () => {
  const now = Date.now();
  const at = (size) => ({ size, ts: now, ttlMin: 5 });
  let r = check(at(85000), 0, now, 80000);
  assert.equal(r.level, 1);
  assert.match(r.msgs[0], /session is at 85k tokens.*\/compact now, or \/clear/);
  assert.equal(check(at(110000), 1, now, 80000).msgs.length, 0);
  r = check(at(121000), 1, now, 80000);
  assert.equal(r.level, 2);
  assert.match(r.msgs[0], /121k/);
  r = check(at(30000), 2, now, 80000); // after /compact
  assert.deepEqual(r, { level: 0, msgs: [] });
  assert.equal(check(at(82000), 0, now, 80000).msgs.length, 1);
});

test('idle warning follows the cache TTL and skips small contexts', () => {
  const now = Date.now();
  const req = (size, idle, ttlMin) => ({ size, ts: now - idle * MIN, ttlMin });
  assert.equal(check(req(60000, 4, 5), 0, now, 80000).msgs.length, 0);
  const r = check(req(60000, 12, 5), 0, now, 80000);
  assert.match(r.msgs[0], /12 min since the last request, past the 5 min prompt-cache TTL.*60k-token prefix/);
  assert.equal(check(req(60000, 30, 60), 0, now, 80000).msgs.length, 0);
  assert.match(check(req(60000, 90, 60), 0, now, 80000).msgs[0], /1h prompt-cache TTL/);
  assert.equal(check(req(20000, 90, 5), 0, now, 80000).msgs.length, 0);
});

test('lastRequest reads the last real request, its TTL, and stops at a compaction', () => {
  const big = JSON.stringify({ type: 'user', message: { content: 'x'.repeat(300000) } });
  const file = transcript([
    assistant('m1', '2026-10-29T01:00:00Z', { input_tokens: 5, cache_read_input_tokens: 1000, output_tokens: 1 }),
    assistant('m2', '2026-10-29T02:00:00Z', {
      input_tokens: 2, cache_read_input_tokens: 90000, cache_creation_input_tokens: 3000,
      cache_creation: { ephemeral_1h_input_tokens: 3000, ephemeral_5m_input_tokens: 0 }, output_tokens: 10,
    }),
    big, // pushes the request past the first 64 KB chunk
    assistant('m3', '2026-10-29T02:00:01Z', { input_tokens: 0, output_tokens: 0 }).replace('claude-opus-5-5', '<synthetic>'),
  ]);
  assert.deepEqual(lastRequest(file), { size: 93002, ts: Date.parse('2026-10-29T02:00:00Z'), ttlMin: 60 });
  fs.appendFileSync(file, JSON.stringify({ type: 'system', subtype: 'compact_boundary' }) + '\n');
  assert.equal(lastRequest(file), null);
});

test('hook warns once, shows the user, then stays quiet until the next step', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'session-warn-home-'));
  const ts = new Date().toISOString();
  const file = transcript([assistant('m1', ts, { input_tokens: 1, cache_read_input_tokens: 84000, output_tokens: 1 })]);
  const run = () => execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: 's1', transcript_path: file, hook_event_name: 'UserPromptSubmit', prompt: 'hi' }),
    env: { ...process.env, TOKENFISHER_HOME: home, TOKENFISHER_WARN_TOKENS: '' },
    encoding: 'utf8',
  });
  const out = JSON.parse(run());
  assert.match(out.systemMessage, /^tokenfisher: session is at 84k tokens/);
  assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(out.hookSpecificOutput.additionalContext, /84k tokens/);
  assert.equal(run(), '');
});
