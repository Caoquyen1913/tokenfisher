#!/usr/bin/env node
'use strict';

// A/B runner: same prompt, same fresh repo, different Claude Code configurations.
// Each run is graded by hidden checks and its cost is taken from `claude -p --output-format json`.
//
// node eval/ab.js [--arms A,B] [--tasks all|1-easy-range,...] [--reps 3] [--model opus]
//                 [--parallel 2] [--budget 5] [--out eval/results/<stamp>] [--claude claude]
// Then: node eval/report.js <out dir>

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { loadTasks, prepareWorkdir, grade, diff, EVAL_DIR } = require('./lib/tasks');
const { arms: armDefs, commonArgs } = require('./arms');

function parseArgs(argv) {
  const a = { arms: 'A,B', tasks: 'all', reps: 3, model: 'opus', parallel: 2, budget: 5, out: null, claude: 'claude', timeoutMin: 20 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (k in a) a[k] = typeof a[k] === 'number' ? Number(argv[++i]) : argv[++i];
  }
  a.out = a.out || path.join(EVAL_DIR, 'results', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
  return a;
}

function shuffle(xs, seed) {
  const out = [...xs];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function runClaude(bin, args, prompt, cwd, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd, env, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { stderr += '\n[ab] timeout, killed'; child.kill(); }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => { stderr += String(e); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
    child.stdin.end(prompt);
  });
}

function parseResult(stdout) {
  const lines = stdout.trim().split('\n').reverse();
  for (const l of lines) {
    try { const o = JSON.parse(l); if (o && o.type === 'result') return o; } catch { /* keep looking */ }
  }
  try { return JSON.parse(stdout); } catch { return null; }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const defs = armDefs({ model: opts.model });
  const armIds = opts.arms.split(',');
  for (const id of armIds) if (!defs[id]) throw new Error(`unknown arm ${id}`);
  const tasks = loadTasks(opts.tasks);
  fs.mkdirSync(opts.out, { recursive: true });

  const jobs = [];
  for (let rep = 1; rep <= opts.reps; rep++) {
    for (const task of tasks) {
      // Randomized arm order per (task, rep) so neither arm always runs first (prompt cache warmth).
      for (const arm of shuffle(armIds, rep * 31 + task.id.length)) jobs.push({ rep, task, arm });
    }
  }
  fs.writeFileSync(path.join(opts.out, 'config.json'), JSON.stringify({
    started: new Date().toISOString(), ...opts,
    arms: Object.fromEntries(armIds.map((id) => [id, { ...defs[id], args: [...commonArgs(opts), ...defs[id].args] }])),
    tasks: tasks.map((t) => ({ id: t.id, level: t.level, prompt: t.prompt })),
  }, null, 2));

  // Warm each arm's prompt cache first (not measured): otherwise the arm whose prefix
  // matches your everyday sessions starts warm and the other pays a cold cache write.
  console.log(`Warming prompt cache for arms ${armIds.join(', ')}…`);
  await Promise.all(armIds.map(async (arm) => {
    const wd = prepareWorkdir(tasks[0]);
    await runClaude(opts.claude, [...commonArgs(opts), ...defs[arm].args], 'Reply with just: ok', wd, process.env, 5 * 60e3);
    fs.rmSync(wd, { recursive: true, force: true });
  }));

  console.log(`${jobs.length} runs (${tasks.length} tasks × ${armIds.length} arms × ${opts.reps} reps), ${opts.parallel} at a time → ${opts.out}`);
  let done = 0;
  const runsFile = path.join(opts.out, 'runs.jsonl');

  async function work(job) {
    const { rep, task, arm } = job;
    const name = `${task.id}__${arm}__r${rep}`;
    const runDir = path.join(opts.out, 'runs', name);
    fs.mkdirSync(runDir, { recursive: true });
    const wd = prepareWorkdir(task);
    const env = { ...process.env, TOKENFISHER_HOME: path.join(runDir, 'tokenfisher') };
    const t0 = Date.now();
    const r = await runClaude(opts.claude, [...commonArgs(opts), ...defs[arm].args], task.prompt, wd, env, opts.timeoutMin * 60e3);
    const res = parseResult(r.stdout);
    const g = grade(task, wd);
    let changes = '';
    try { changes = diff(wd); } catch (e) { changes = `diff failed: ${e.message}`; }
    fs.writeFileSync(path.join(runDir, 'transcript.jsonl'), r.stdout);
    fs.writeFileSync(path.join(runDir, 'result.json'), JSON.stringify(res, null, 2));
    fs.writeFileSync(path.join(runDir, 'stderr.txt'), r.stderr);
    fs.writeFileSync(path.join(runDir, 'grade.json'), JSON.stringify(g, null, 2));
    fs.writeFileSync(path.join(runDir, 'changes.diff'), changes);
    const u = (res && res.usage) || {};
    const rec = {
      name, task: task.id, level: task.level, arm, rep,
      ok: !!res && !res.is_error,
      subtype: res && res.subtype,
      cost_usd: res ? res.total_cost_usd : null,
      input: u.input_tokens || 0,
      cache_write: u.cache_creation_input_tokens || 0,
      cache_read: u.cache_read_input_tokens || 0,
      output: u.output_tokens || 0,
      turns: res && res.num_turns,
      duration_ms: res ? res.duration_ms : Date.now() - t0,
      models: res && res.modelUsage ? Object.keys(res.modelUsage) : [],
      score: g.score, passed: g.passed, total: g.total,
      failed: g.checks.filter((c) => !c.ok).map((c) => c.name),
    };
    fs.appendFileSync(runsFile, JSON.stringify(rec) + '\n');
    // Windows can keep a lock on the temp dir for a moment; a leftover dir must not abort the run.
    try { fs.rmSync(wd, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* left in %TEMP% */ }
    done++;
    console.log(`[${done}/${jobs.length}] ${name.padEnd(36)} score ${g.passed}/${g.total}  $${(rec.cost_usd ?? NaN).toFixed(3)}  turns ${rec.turns}  ${rec.ok ? '' : `ERROR ${rec.subtype || r.code}`}`);
  }

  const queue = [...jobs];
  await Promise.all(Array.from({ length: Math.max(1, opts.parallel) }, async () => {
    while (queue.length) await work(queue.shift());
  }));
  console.log(`\nDone. Report: node eval/report.js "${opts.out}"`);
}

main().catch((e) => { console.error(e.stack || String(e)); process.exitCode = 1; });
