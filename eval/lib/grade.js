#!/usr/bin/env node
'use strict';

// Grades one finished workdir: node grade.js <taskDir> <workdir>
// Prints JSON { checks: [{ name, ok, error }], passed, total, score }.
// Runs in its own process so each grade gets a fresh module cache.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [taskDir, workdir] = process.argv.slice(2);
const task = JSON.parse(fs.readFileSync(path.join(taskDir, 'task.json'), 'utf8'));
const checks = [];

function run(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (e) {
    checks.push({ name, ok: false, error: String(e && e.message || e).slice(0, 300) });
  }
}

// The visible suite must pass, as the prompt asks.
run('visible test suite passes', () => {
  const r = spawnSync(process.execPath, ['test/run.js'], { cwd: workdir, encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0) throw new Error((r.stdout || '').split('\n').filter((l) => /✗|Tests:/.test(l)).slice(0, 5).join(' | ') || `exit ${r.status}`);
});

// Original tests must survive: byte-identical when the prompt froze them,
// otherwise every original test name must still exist.
run(task.testsFrozen ? 'original tests unchanged' : 'original tests still present', () => {
  const origDir = path.join(taskDir, 'repo', 'test');
  const now = fs.readdirSync(path.join(workdir, 'test')).filter((f) => f.endsWith('.test.js'))
    .map((f) => fs.readFileSync(path.join(workdir, 'test', f), 'utf8')).join('\n');
  for (const f of fs.readdirSync(origDir).filter((x) => x.endsWith('.test.js'))) {
    const orig = fs.readFileSync(path.join(origDir, f), 'utf8');
    if (task.testsFrozen) {
      const cur = fs.existsSync(path.join(workdir, 'test', f)) ? fs.readFileSync(path.join(workdir, 'test', f), 'utf8') : '';
      if (cur.replace(/\r\n/g, '\n') !== orig.replace(/\r\n/g, '\n')) throw new Error(`${f} was modified`);
    } else {
      for (const m of orig.matchAll(/test\((`[^`]*`|'[^']*')/g)) {
        if (!now.includes(m[1])) throw new Error(`missing original test ${m[1]}`);
      }
    }
  }
});

let hidden = {};
run('hidden checks load', () => { hidden = require(path.join(taskDir, 'hidden', 'checks.js'))(workdir.replace(/\\/g, '/')); });
for (const [name, fn] of Object.entries(hidden)) run(name, fn);

const passed = checks.filter((c) => c.ok).length;
process.stdout.write(JSON.stringify({ checks, passed, total: checks.length, score: passed / checks.length }));
