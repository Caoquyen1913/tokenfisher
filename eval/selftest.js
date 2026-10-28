#!/usr/bin/env node
'use strict';

// Proves the graders discriminate: every untouched task must fail its checks,
// and the reference solution must pass all of them. No model calls.

const fs = require('fs');
const { loadTasks, prepareWorkdir, applySolution, grade } = require('./lib/tasks');

let bad = 0;
for (const task of loadTasks('all')) {
  const untouched = prepareWorkdir(task);
  const before = grade(task, untouched);
  fs.rmSync(untouched, { recursive: true, force: true });
  const wd = prepareWorkdir(task);
  applySolution(task, wd);
  const after = grade(task, wd);
  const ok = before.score < 1 && after.score === 1;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${task.id.padEnd(22)} ${task.level.padEnd(8)} untouched ${before.passed}/${before.total}  reference ${after.passed}/${after.total}`);
  if (after.score < 1) for (const c of after.checks.filter((x) => !x.ok)) console.log(`       reference failed: ${c.name}: ${c.error}`);
  fs.rmSync(wd, { recursive: true, force: true });
}
process.exitCode = bad ? 1 : 0;
