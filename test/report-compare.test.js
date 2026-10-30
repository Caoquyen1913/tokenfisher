'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPORT = path.join(__dirname, '..', 'bin', 'token-report.js');

function session(dir, name, ts, model, policy, n) {
  const lines = [JSON.stringify({ type: 'attachment', content: policy })];
  for (let i = 0; i < n; i++) {
    lines.push(JSON.stringify({
      type: 'assistant', timestamp: new Date(ts + i * 1000).toISOString(),
      message: { id: `${name}-${i}`, model, usage: { input_tokens: 0, cache_creation_input_tokens: 1000, cache_read_input_tokens: 10000, output_tokens: 100 } },
    }));
  }
  fs.mkdirSync(path.join(dir, 'proj'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'proj', `${name}.jsonl`), lines.join('\n') + '\n');
}

test('--compare splits requests and sessions at the date and names each session level', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-'));
  const cut = new Date('2026-10-30T00:00:00').getTime();
  session(dir, 'old', cut - 2 * 864e5, 'claude-opus-5-5', 'no policy here', 4);
  session(dir, 'new', cut + 3600e3, 'claude-sonnet-5-5', 'tokenfisher policy, level ultra (correctness first, then cost):', 2);
  const out = JSON.parse(execFileSync('node', [REPORT, '--dir', dir, '--compare', '2026-10-30', '--days', '7', '--json'], { encoding: 'utf8' }));
  assert.equal(out.measures.requests.before, 4);
  assert.equal(out.measures.requests.after, 2);
  assert.equal(out.measures['Opus/Fable share'].before, 1);
  assert.equal(out.measures['Opus/Fable share'].after, 0);
  assert.deepEqual(out.levels, { before: { none: 1 }, after: { ultra: 1 } });
});

test('a bad date is refused', () => {
  assert.throws(() => execFileSync('node', [REPORT, '--compare', 'yesterday'], { encoding: 'utf8', stdio: 'pipe' }), /needs a date/);
});

test('--month totals one calendar month and splits it by the account each session logged', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-month-'));
  const home = path.join(dir, 'tf');
  fs.mkdirSync(home);
  session(dir, 'oct', new Date('2026-10-10T10:00:00').getTime(), 'claude-sonnet-5-5', 'tokenfisher policy, level high (x)', 3);
  session(dir, 'nov', new Date('2026-11-02T10:00:00').getTime(), 'claude-opus-5-5', 'none', 5);
  session(dir, 'oct2', new Date('2026-10-20T10:00:00').getTime(), 'claude-opus-5-5', 'none', 2);
  fs.writeFileSync(path.join(home, 'sessions.jsonl'), JSON.stringify({ session: 'oct', auth: 'claude.ai', account: 'me@example.com', plan: 'stripe_subscription' }) + '\n');
  const out = JSON.parse(execFileSync('node', [REPORT, '--dir', dir, '--month', '2026-10', '--json'], { encoding: 'utf8', env: { ...process.env, TOKENFISHER_HOME: home } }));
  assert.equal(out.sessions, 2);
  assert.equal(out.total.requests, 5);
  assert.equal(out.byAccount['me@example.com (stripe_subscription)'].requests, 3);
  assert.equal(out.byAccount['unknown (before session logging)'].requests, 2);
  assert.equal(out.byLevel.high.requests, 3);
});

test('session-log names the credential without storing it', () => {
  const { credential } = require('../bin/session-log');
  assert.deepEqual(credential({ CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat-abc' }).auth, 'oauth-token');
  assert.match(credential({ ANTHROPIC_API_KEY: 'sk-ant-api-xyz' }).account, /^api-key #[0-9a-f]{8}$/);
  assert.doesNotMatch(JSON.stringify(credential({ CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat-abc' })), /sk-ant/);
});
