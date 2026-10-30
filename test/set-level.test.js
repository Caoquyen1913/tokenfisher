'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const BIN = path.join(__dirname, '..', 'bin');

function sandbox(settings) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'set-level-'));
  const file = path.join(dir, 'settings.json');
  if (settings !== undefined) fs.writeFileSync(file, typeof settings === 'string' ? settings : JSON.stringify(settings));
  const env = { ...process.env, TOKENFISHER_SETTINGS: file, TOKENFISHER_HOME: path.join(dir, 'tf') };
  delete env.TOKENFISHER_LEVEL;
  const node = (script, args = [], input) => execFileSync('node', [path.join(BIN, script), ...args], { env, encoding: 'utf8', input });
  return {
    file,
    set: (...args) => JSON.parse(node('set-level.js', args)),
    read: () => JSON.parse(fs.readFileSync(file, 'utf8')),
    policy: () => JSON.parse(node('session-policy.js')).hookSpecificOutput.additionalContext,
  };
}

test('each level writes its own settings', () => {
  const s = sandbox({ permissions: { defaultMode: 'auto' } });
  s.set('apply', 'low');
  assert.deepEqual(s.read(), { permissions: { defaultMode: 'auto' }, agent: 'tokenfisher:inherit' });
  s.set('apply', 'high');
  assert.deepEqual(s.read(), { permissions: { defaultMode: 'auto' }, autoCompactWindow: 200000, env: { CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet' } });
  s.set('apply', 'ultra');
  assert.deepEqual(s.read(), { permissions: { defaultMode: 'auto' }, autoCompactWindow: 150000, effortLevel: 'low', env: { CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet' } });
  s.set('apply', 'promax');
  assert.deepEqual(s.read(), { permissions: { defaultMode: 'auto' }, agent: 'tokenfisher:lean', autoCompactWindow: 100000, effortLevel: 'low', env: { CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet' } });
  assert.equal(s.set().current, 'promax');
});

test('off removes only what tokenfisher wrote and keeps the rest of env', () => {
  const s = sandbox({ env: { FOO: '1' } });
  s.set('apply', 'promax');
  s.set('off');
  assert.deepEqual(s.read(), { env: { FOO: '1' } });
  assert.equal(s.set().current, 'high'); // back to the plugin default
});

test("never overwrites or removes the user's own values", () => {
  const s = sandbox({ autoCompactWindow: 500000, effortLevel: 'high' });
  const plan = s.set('plan', 'ultra').changes;
  assert.match(plan.find((r) => r.key === 'autoCompactWindow').action, /^skip/);
  s.set('apply', 'ultra');
  assert.equal(s.read().autoCompactWindow, 500000);
  assert.equal(s.read().effortLevel, 'high');
  s.set('off');
  assert.deepEqual(s.read(), { autoCompactWindow: 500000, effortLevel: 'high' });
});

test('a value the user changed after a switch is theirs from then on', () => {
  const s = sandbox({});
  s.set('apply', 'high');
  fs.writeFileSync(s.file, JSON.stringify({ ...s.read(), autoCompactWindow: 300000 }));
  s.set('apply', 'ultra');
  assert.equal(s.read().autoCompactWindow, 300000);
  s.set('off');
  assert.deepEqual(s.read(), { autoCompactWindow: 300000 });
});

test('the policy follows the level', () => {
  const s = sandbox({});
  assert.match(s.policy(), /level high/);
  assert.match(s.policy(), /haiku to locate code/);
  s.set('apply', 'low');
  assert.match(s.policy(), /level low/);
  assert.doesNotMatch(s.policy(), /haiku to locate code/);
});

test('unknown level and invalid settings JSON are refused without writing', () => {
  const s = sandbox('{ not json');
  assert.throws(() => s.set('apply', 'turbo'), /unknown level/);
  assert.throws(() => s.set('apply', 'high'), /not valid JSON/);
  assert.equal(fs.readFileSync(s.file, 'utf8'), '{ not json');
});
