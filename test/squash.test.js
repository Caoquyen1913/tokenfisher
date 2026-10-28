'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { squash, classify, isProgress } = require('../lib/squash');

const HOOK = path.join(__dirname, '..', 'bin', 'squash-hook.js');

function jestFailureLog() {
  const lines = [];
  for (let i = 0; i < 300; i++) lines.push(`  ✓ renders item ${i} (${i % 7} ms)`);
  lines.push(
    '  ● Cart › applies discount',
    '',
    '    expect(received).toBe(expected) // Object.is equality',
    '',
    '    Expected: 90',
    '    Received: 100',
    '',
    '      at Object.<anonymous> (src/cart.test.js:42:23)',
  );
  for (let i = 0; i < 200; i++) lines.push(`  ✓ another passing test ${i}`);
  lines.push('Tests:       1 failed, 500 passed, 501 total', 'Time:        4.2 s');
  return lines.join('\n');
}

test('short output is left alone', () => {
  const r = squash('ok\n'.repeat(10));
  assert.equal(r.changed, false);
});

test('long test output keeps failure detail, summary, and drops passing noise', () => {
  const input = jestFailureLog();
  const r = squash(input);
  assert.ok(r.changed);
  assert.ok(r.omittedLines > 400, `omitted ${r.omittedLines}`);
  assert.ok(r.text.length < input.length / 4, `${r.text.length} vs ${input.length}`);
  for (const must of ['Expected: 90', 'Received: 100', 'src/cart.test.js:42:23', 'Tests:       1 failed', 'applies discount']) {
    assert.ok(r.text.includes(must), `missing: ${must}`);
  }
  assert.match(r.text, /lines omitted/);
});

test('ANSI codes, progress redraws and repeated lines are cleaned', () => {
  const input = [
    '\x1b[32mInstalling\x1b[0m',
    ...Array.from({ length: 80 }, (_, i) => `Downloading pkg ${i}% |████████    | 1.2MB/s`),
    'progress 10%\rprogress 50%\rprogress done',
    ...Array.from({ length: 50 }, () => 'npm warn deprecated inflight@1.0.6: leaks memory'),
    'added 812 packages in 12s',
  ].join('\n');
  const r = squash(input);
  assert.ok(r.changed);
  assert.ok(!r.text.includes('\x1b['));
  assert.ok(!r.text.includes('████'));
  assert.ok(r.text.includes('progress done') && !r.text.includes('progress 10%'));
  assert.match(r.text, /repeated 49 more times/);
  assert.ok(r.text.includes('added 812 packages'));
  assert.equal(r.omittedLines, 0);
});

test('isProgress does not eat pytest lines or plain percentages', () => {
  assert.equal(isProgress('tests/test_api.py ....F...  [ 50%]'), false);
  assert.equal(isProgress('Coverage: 87%'), false);
  assert.equal(isProgress(' 45%|████▌     | 45/100 [00:01<00:01, 40.1it/s]'), true);
});

test('classify: content views pass, noisy families get full, the rest clean only', () => {
  for (const c of ['git diff', 'git --no-pager show HEAD', 'cat package.json', 'Get-Content a.txt -Tail 50',
    'gh pr list --json number', 'npm test # no-squash', 'kubectl get pods -o json',
    'cd /c/repo && cat -n spiders/a.py | sed -n 50,609p', 'npm test 2>&1 | tail -50',
    'P=/tmp/x; grep -n foo $P/a.html | head -20']) {
    assert.equal(classify(c), 'pass', c);
  }
  for (const c of ['npm test', 'pytest -q', 'git log --oneline', 'npm install', 'dotnet build',
    'cd backend && python -m pytest tests/', 'CI=1 npx vitest run', 'cargo build --release',
    'node test/run.js', 'node --test test/', 'node tests/unit.test.mjs']) {
    assert.equal(classify(c), 'full', c);
  }
  for (const c of ['ls -la', 'python scripts/scrape.py', 'grep -rn TODO src', 'curl -s https://x', 'node scripts/build-index.js']) {
    assert.equal(classify(c), 'clean', c);
  }
});

test('clean mode never drops content lines', () => {
  const input = Array.from({ length: 400 }, (_, i) => `src/file${i}.ts:${i}: TODO fix ${'x'.repeat(i % 50)}`).join('\n');
  const r = squash(input, { mode: 'clean' });
  assert.equal(r.omittedLines, 0);
  assert.equal(r.changed, false);
});

function runHook(payload, env = {}) {
  const out = execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return out ? JSON.parse(out) : null;
}

test('hook rewrites long output, keeps the response shape, and saves the raw output', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tokenfisher-'));
  const stdout = jestFailureLog();
  const res = runHook({
    session_id: 's1', tool_name: 'Bash', tool_use_id: 'toolu_abc123',
    tool_input: { command: 'npm test' },
    tool_response: { stdout, stderr: '', interrupted: false, isImage: false, noOutputExpected: false },
  }, { TOKENFISHER_HOME: home });
  const o = res.hookSpecificOutput.updatedToolOutput;
  assert.equal(res.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.deepEqual(Object.keys(o).sort(), ['interrupted', 'isImage', 'noOutputExpected', 'stderr', 'stdout']);
  assert.ok(o.stdout.includes('Received: 100'));
  const m = o.stdout.match(/full output saved at (.+?\.txt)/);
  assert.ok(m, 'raw path in footer');
  assert.ok(fs.readFileSync(m[1], 'utf8').includes(stdout));
  const stats = fs.readFileSync(path.join(home, 'stats.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(stats.length, 1);
  assert.ok(stats[0].after < stats[0].before);
});

test('hook redacts inline credentials in the stats and raw files', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tokenfisher-'));
  runHook({
    tool_name: 'PowerShell', tool_use_id: 'toolu_x',
    tool_input: { command: "$env:PGPASSWORD='hunter2'; API_KEY=sk-123 npm test" },
    tool_response: { stdout: jestFailureLog(), stderr: '', interrupted: false, isImage: false },
  }, { TOKENFISHER_HOME: home });
  const raw = fs.readdirSync(path.join(home, 'raw')).map((f) => fs.readFileSync(path.join(home, 'raw', f), 'utf8')).join('');
  const all = fs.readFileSync(path.join(home, 'stats.jsonl'), 'utf8') + raw.split('\n')[0];
  assert.ok(!all.includes('hunter2') && !all.includes('sk-123'), all);
});

test('hook emits nothing for short output, passthrough commands, bad input, or when disabled', () => {
  const big = { stdout: jestFailureLog(), stderr: '', interrupted: false, isImage: false };
  assert.equal(runHook({ tool_input: { command: 'ls' }, tool_response: { stdout: 'a\nb', stderr: '' } }), null);
  assert.equal(runHook({ tool_input: { command: 'git diff' }, tool_response: big }), null);
  assert.equal(runHook({ tool_input: { command: 'npm test' }, tool_response: big }, { TOKENFISHER_DISABLE: '1' }), null);
  const out = execFileSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.equal(out, '');
});
