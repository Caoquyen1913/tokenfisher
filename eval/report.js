#!/usr/bin/env node
'use strict';

// Turns an A/B results dir into REPORT.md + summary.json: quality and cost per arm,
// per difficulty level and per task, with paired bootstrap confidence intervals
// against the baseline arm and links to every run's evidence.
//
// node eval/report.js <results dir> [--baseline A] [--margin 0.05]

const fs = require('fs');
const path = require('path');
const { LEVELS } = require('./lib/tasks');

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('baseline', 'A');
const MARGIN = Number(opt('margin', 0.05)); // max acceptable quality drop (absolute score)

const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const runs = fs.readFileSync(path.join(dir, 'runs.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const arms = Object.keys(config.arms);
const tasks = [...new Set(runs.map((r) => r.task))].sort();

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const tokens = (r) => r.input + r.cache_write + r.cache_read + r.output;
const pct = (x) => (Number.isFinite(x) ? `${(100 * x).toFixed(1)}%` : '–');
// A cost cut of 0.3 reads "−30.0%"; a negative cut (more expensive) reads "+13.5%".
const change = (cut) => (Number.isFinite(cut) ? `${cut >= 0 ? '−' : '+'}${(100 * Math.abs(cut)).toFixed(1)}%` : '–');
const usd = (x) => (Number.isFinite(x) ? `$${x.toFixed(3)}` : '–');
const k = (x) => (Number.isFinite(x) ? (x >= 1e6 ? `${(x / 1e6).toFixed(2)}M` : `${(x / 1e3).toFixed(1)}k`) : '–');

function stats(rs) {
  return {
    n: rs.length,
    quality: mean(rs.map((r) => r.score)),
    fullPass: mean(rs.map((r) => (r.score === 1 ? 1 : 0))),
    cost: mean(rs.map((r) => r.cost_usd || 0)),
    totalCost: sum(rs.map((r) => r.cost_usd || 0)),
    tokens: mean(rs.map(tokens)),
    output: mean(rs.map((r) => r.output)),
    turns: mean(rs.map((r) => r.turns || 0)),
    errors: rs.filter((r) => !r.ok).length,
  };
}

// Pairs runs of arm X with the baseline run of the same task and rep.
function pairs(arm, filter = () => true) {
  const out = [];
  for (const r of runs.filter((x) => x.arm === arm && filter(x))) {
    const b = runs.find((x) => x.arm === BASE && x.task === r.task && x.rep === r.rep);
    if (b) out.push({ x: r, b });
  }
  return out;
}

let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

function bootstrap(ps, stat, n = 4000) {
  if (!ps.length) return [NaN, NaN, NaN];
  const point = stat(ps);
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(stat(ps.map(() => ps[Math.floor(rnd() * ps.length)])));
  xs.sort((a, b) => a - b);
  return [point, xs[Math.floor(0.025 * n)], xs[Math.floor(0.975 * n)]];
}

const costCut = (ps) => 1 - sum(ps.map((p) => p.x.cost_usd || 0)) / sum(ps.map((p) => p.b.cost_usd || 0));
const qualityDelta = (ps) => mean(ps.map((p) => p.x.score - p.b.score));

const summary = { config: { model: config.model, reps: config.reps, baseline: BASE, margin: MARGIN }, arms: {}, comparisons: {} };
const md = [];
md.push('# tokenfisher A/B report', '');
md.push(`Run started ${config.started} · model \`${config.model}\` · ${tasks.length} tasks × ${arms.length} arms × ${config.reps} reps = ${runs.length} runs.`);
md.push(`Quality = share of grader checks passed (hidden tests + visible suite passes + original tests intact). Cost = \`total_cost_usd\` reported by \`claude -p\`.`, '');
md.push('## Arms', '');
for (const a of arms) md.push(`- **${a} — ${config.arms[a].label}**: ${config.arms[a].describe}`);
md.push('', `Common flags: \`${config.arms[arms[0]].args.slice(0, config.arms[arms[0]].args.indexOf('--model')).join(' ').replace(/\n/g, ' ')}\``, '');

md.push('## Verdict vs baseline', '');
md.push('| arm | cost change (95% CI) | quality Δ (95% CI) | quality non-inferior (margin −' + MARGIN + ') | cost cut significant |');
md.push('|---|---|---|---|---|');
for (const a of arms.filter((x) => x !== BASE)) {
  const ps = pairs(a);
  const [cut, cutLo, cutHi] = bootstrap(ps, costCut);
  const [dq, dqLo, dqHi] = bootstrap(ps, qualityDelta);
  const levelDrops = LEVELS.map((l) => qualityDelta(pairs(a, (r) => r.level === l))).filter(Number.isFinite);
  const nonInferior = dqLo >= -MARGIN && levelDrops.every((d) => d >= -MARGIN);
  const significant = cutLo > 0;
  summary.comparisons[a] = { pairs: ps.length, costCut: [cut, cutLo, cutHi], qualityDelta: [dq, dqLo, dqHi], nonInferior, significant };
  md.push(`| ${a} ${config.arms[a].label} | **${change(cut)}** (${change(cutHi)} … ${change(cutLo)}) | ${dq >= 0 ? '+' : ''}${dq.toFixed(3)} (${dqLo.toFixed(3)} … ${dqHi.toFixed(3)}) | ${nonInferior ? 'yes' : '**no**'} | ${significant ? 'yes' : 'no'} |`);
}
md.push('', 'Cost change is 1 − Σcost(arm)/Σcost(baseline) over runs paired by task and rep; CIs are paired bootstrap (4,000 resamples). "Non-inferior" means the lower CI bound of the quality change and every level\'s mean change are above −margin.', '');

md.push('## By arm', '');
md.push('| arm | runs | quality | all checks pass | mean cost | total cost | mean tokens | mean output | turns | errors |');
md.push('|---|---|---|---|---|---|---|---|---|---|');
for (const a of arms) {
  const s = stats(runs.filter((r) => r.arm === a));
  summary.arms[a] = s;
  md.push(`| ${a} ${config.arms[a].label} | ${s.n} | ${pct(s.quality)} | ${pct(s.fullPass)} | ${usd(s.cost)} | ${usd(s.totalCost)} | ${k(s.tokens)} | ${k(s.output)} | ${s.turns.toFixed(1)} | ${s.errors} |`);
}

md.push('', '## By difficulty (easy → complex)', '');
md.push(`| level | ${arms.map((a) => `${a} quality`).join(' | ')} | ${arms.map((a) => `${a} cost`).join(' | ')} | ${arms.filter((a) => a !== BASE).map((a) => `${a} cost vs ${BASE}`).join(' | ')} |`);
md.push(`|---|${arms.map(() => '---').join('|')}|${arms.map(() => '---').join('|')}|${arms.filter((a) => a !== BASE).map(() => '---').join('|')}|`);
for (const l of LEVELS) {
  const rs = runs.filter((r) => r.level === l);
  if (!rs.length) continue;
  const q = arms.map((a) => pct(stats(rs.filter((r) => r.arm === a)).quality));
  const c = arms.map((a) => usd(stats(rs.filter((r) => r.arm === a)).cost));
  const d = arms.filter((a) => a !== BASE).map((a) => change(costCut(pairs(a, (r) => r.level === l))));
  md.push(`| ${l} | ${q.join(' | ')} | ${c.join(' | ')} | ${d.join(' | ')} |`);
}

md.push('', '## By task', '');
md.push(`| task | level | ${arms.map((a) => `${a} quality`).join(' | ')} | ${arms.map((a) => `${a} cost`).join(' | ')} | ${arms.map((a) => `${a} tokens`).join(' | ')} |`);
md.push(`|---|---|${arms.map(() => '---').join('|')}|${arms.map(() => '---').join('|')}|${arms.map(() => '---').join('|')}|`);
for (const t of tasks) {
  const rs = runs.filter((r) => r.task === t);
  const per = arms.map((a) => stats(rs.filter((r) => r.arm === a)));
  md.push(`| ${t} | ${rs[0].level} | ${per.map((s) => pct(s.quality)).join(' | ')} | ${per.map((s) => usd(s.cost)).join(' | ')} | ${per.map((s) => k(s.tokens)).join(' | ')} |`);
}

md.push('', '## Every run (evidence)', '');
md.push('Each folder under `runs/` holds `transcript.jsonl` (every message, tool call and tool result of the run), `result.json` (usage, cost and final answer), `grade.json` (every check), `changes.diff` (what the agent changed) and, for tokenfisher arms, `tokenfisher/` (compressed-output stats and the raw outputs it saved).', '');
md.push('| run | score | cost | tokens | turns | failed checks |');
md.push('|---|---|---|---|---|---|');
for (const r of [...runs].sort((a, b) => a.name.localeCompare(b.name))) {
  md.push(`| [${r.name}](runs/${r.name}/) | ${r.passed}/${r.total} | ${usd(r.cost_usd)} | ${k(tokens(r))} | ${r.turns ?? '–'} | ${r.failed.join(', ') || '–'}${r.ok ? '' : ` (ERROR ${r.subtype || ''})`} |`);
}

md.push('', '## Caveats', '');
md.push(`- ${config.reps} reps per task: CIs are wide; treat small differences as noise.`);
md.push('- Tasks are small synthetic JS repos; real sessions are longer, so per-request savings (startup context, tool output) compound more there.');
md.push('- All arms skip user-level settings (personal hooks), so savings from removing per-call hooks are not counted.');
md.push('- Cost is Claude Code\'s own estimate at list price.');

fs.writeFileSync(path.join(dir, 'REPORT.md'), md.join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(md.slice(0, md.indexOf('## By task')).join('\n'));
console.log(`\nFull report: ${path.join(dir, 'REPORT.md')}`);
