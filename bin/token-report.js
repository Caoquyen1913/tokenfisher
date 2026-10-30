#!/usr/bin/env node
'use strict';

// Reads Claude Code transcripts (~/.claude/projects/**/*.jsonl) and reports
// where tokens went: by billing category, model, project, tool result, and the
// "rent" each tool result pays by staying in context for later requests.
//
// Usage: node token-report.js [--days 7] [--project <substr>] [--session <id>] [--top 10] [--simulate] [--json]
// --simulate replays the squash filter over past shell outputs to estimate what it would have saved.

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { squash, classify } = require('../lib/squash');

// Price relative to one uncached input token (same ratios for current Claude models).
const W = { input: 1, write5m: 1.25, write1h: 2, read: 0.1, output: 5 };
const CHARS_PER_TOKEN = 4;
const REBUILD_MIN = 20000;
const LONG_SESSION = 150;
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

function parseArgs(argv) {
  const a = { days: 7, project: null, session: null, top: 10, json: false, dir: null, simulate: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--json') a.json = true;
    else if (k === '--simulate') a.simulate = true;
    else if (k === '--days') a.days = Number(argv[++i]);
    else if (k === '--project') a.project = argv[++i];
    else if (k === '--session') a.session = argv[++i];
    else if (k === '--top') a.top = Number(argv[++i]);
    else if (k === '--dir') a.dir = argv[++i];
    else if (k === '--compare') a.compare = argv[++i];
    else if (k === '--month') a.month = argv[++i];
    else if (k === '-h' || k === '--help') {
      console.log('node token-report.js [--days 7] [--project <substr>] [--session <id>] [--top 10] [--simulate] [--json] [--dir <projects dir>]\n'
        + '                       [--compare YYYY-MM-DD]   the --days before that date vs the --days from it on\n'
        + '                       [--month YYYY-MM]        one calendar month: totals by account, source, model, project and level');
      process.exit(0);
    }
  }
  return a;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

function contentText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((c) => (c && c.type === 'text' && typeof c.text === 'string' ? c.text : '')).join('');
}

function labelFor(name, input) {
  if (!input) return '';
  const v = input.command || input.file_path || input.pattern || input.url || input.query
    || input.description || input.prompt || JSON.stringify(input);
  return String(v).replace(/\s+/g, ' ').slice(0, 80);
}

function weighted(u) {
  return u.input * W.input + u.write5m * W.write5m + u.write1h * W.write1h + u.read * W.read + u.output * W.output;
}

function emptyUsage() {
  return { requests: 0, input: 0, write5m: 0, write1h: 0, read: 0, output: 0, thinking: 0 };
}

function addUsage(acc, u) {
  for (const k of Object.keys(acc)) acc[k] += u[k] || 0;
}

function normUsage(usage) {
  const cc = usage.cache_creation || {};
  const total = usage.cache_creation_input_tokens || 0;
  const w1h = cc.ephemeral_1h_input_tokens || 0;
  return {
    requests: 1,
    input: usage.input_tokens || 0,
    write1h: w1h,
    write5m: cc.ephemeral_5m_input_tokens != null ? cc.ephemeral_5m_input_tokens : total - w1h,
    read: usage.cache_read_input_tokens || 0,
    output: usage.output_tokens || 0,
    thinking: (usage.output_tokens_details && usage.output_tokens_details.thinking_tokens) || 0,
  };
}

async function parseFile(file, simulate) {
  const requests = new Map(); // message.id -> { usage, model, index, ts }
  const toolUses = new Map(); // tool_use_id -> { name, label }
  const results = [];         // { id, chars, at }
  const boundaries = [];      // request index where a compaction happened
  let level = 'none';         // tokenfisher level, from the SessionStart policy text
  let entrypoint = null;      // cli, claude-desktop, sdk-ts, sdk-py…
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    if (level === 'none' && line.includes('policy')) level = levelOf(line) || level;
    if (!entrypoint && line.includes('"entrypoint"')) entrypoint = (/"entrypoint":"([^"]+)"/.exec(line) || [])[1] || null;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.type === 'system' && o.subtype === 'compact_boundary') boundaries.push(requests.size);
    const m = o.message;
    if (!m) continue;
    if (o.type === 'assistant' && m.id && m.usage && m.model !== '<synthetic>') {
      // One API response is logged once per content block; keep the first entry.
      if (!requests.has(m.id)) {
        requests.set(m.id, { usage: normUsage(m.usage), model: m.model || 'unknown', index: requests.size, ts: Date.parse(o.timestamp) });
      }
      for (const c of Array.isArray(m.content) ? m.content : []) {
        if (c.type === 'tool_use') {
          toolUses.set(c.id, { name: c.name, label: labelFor(c.name, c.input), command: c.input && c.input.command });
        }
      }
    } else if (o.type === 'user' && Array.isArray(m.content)) {
      for (const c of m.content) {
        if (c.type !== 'tool_result') continue;
        const text = contentText(c.content);
        const tu = toolUses.get(c.tool_use_id);
        // --simulate needs shell output text and the command that produced it.
        const shell = simulate && tu && SHELL_TOOLS.has(tu.name);
        results.push({ id: c.tool_use_id, chars: text.length, at: requests.size, text: shell ? text : null, command: shell ? tu.command : null });
      }
    }
  }
  return { requests: [...requests.values()], toolUses, results, boundaries, level, entrypoint };
}

// "tokenfisher policy, level ultra" (0.4+), "tokenfisher policy (" (0.3, Sonnet default), "max-diet policy" (tokenfisher-max).
function levelOf(line) {
  const m = /tokenfisher policy, level (\w+)/.exec(line);
  if (m) return m[1];
  if (line.includes('tokenfisher max-diet policy')) return 'max (0.1)';
  if (line.includes('tokenfisher policy (')) return 'plugin 0.3';
  return null;
}

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(Math.round(n));
}

function pct(a, b) {
  return b ? (100 * a / b).toFixed(1) + '%' : '-';
}

function table(rows, header) {
  const all = [header, ...rows].map((r) => r.map(String));
  const widths = header.map((_, i) => Math.max(...all.map((r) => r[i].length)));
  const numeric = header.map((_, i) => all.slice(1).every((r) => /^[\d.,%kM-]+$/.test(r[i])));
  return all.map((r) => r.map((c, i) => (numeric[i] ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join('  ').trimEnd()).join('\n');
}

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function readSquashStats(since) {
  const file = path.join(process.env.TOKENFISHER_HOME || path.join(os.homedir(), '.claude', 'tokenfisher'), 'stats.jsonl');
  const s = { calls: 0, before: 0, after: 0 };
  if (!fs.existsSync(file)) return s;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    try {
      const o = JSON.parse(line);
      if (Date.parse(o.ts) < since) continue;
      s.calls++; s.before += o.before; s.after += o.after;
    } catch { /* skip */ }
  }
  return s;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = args.dir || path.join(os.homedir(), '.claude', 'projects');
  if (args.month) return monthReport(args, root);
  const cut = args.compare ? new Date(`${args.compare}T00:00:00`).getTime() : null;
  if (args.compare && !Number.isFinite(cut)) throw new Error(`--compare needs a date like 2026-10-30, got "${args.compare}"`);
  const since = cut ? cut - args.days * 864e5 : Date.now() - args.days * 864e5;
  let files = walk(root).filter((f) => fs.statSync(f).mtimeMs >= since);
  if (args.project) files = files.filter((f) => path.relative(root, f).split(path.sep)[0].toLowerCase().includes(args.project.toLowerCase()));
  if (args.session) files = files.filter((f) => f.includes(args.session));

  const total = emptyUsage();
  const byModel = new Map();
  const byProject = new Map();
  const byKind = { main: emptyUsage(), subagent: emptyUsage() };
  const byTool = new Map();
  const big = [];
  const startup = [];
  const longSessions = [];
  const rebuild = { count: 0, weighted: 0, idle: 0 };
  const sim = { calls: 0, squashed: 0, tokensSaved: 0, rentBefore: 0, rentSaved: 0 };
  const byLevel = new Map(); // level -> { sessions, usage } (main sessions only)
  const periods = { before: newPeriod(), after: newPeriod() };
  let sessions = 0;

  for (const file of files) {
    const { requests, toolUses, results, boundaries, level } = await parseFile(file, args.simulate);
    if (!requests.length) continue;
    const rel = path.relative(root, file);
    const project = rel.split(path.sep)[0];
    const isSub = rel.split(path.sep).includes('subagents');
    if (cut) {
      for (const r of requests) {
        if (!(r.ts >= since) || r.ts >= cut + args.days * 864e5) continue;
        const p = periods[r.ts < cut ? 'before' : 'after'];
        addUsage(p.total, r.usage);
        addUsage(isSub ? p.sub : p.main, r.usage);
        if (/opus|fable/i.test(r.model)) addUsage(p.opus, r.usage);
      }
      const startTs = requests[0].ts;
      if (!isSub && startTs >= since && startTs < cut + args.days * 864e5) {
        const p = periods[startTs < cut ? 'before' : 'after'];
        p.lengths.push(requests.length);
        p.levels[level] = (p.levels[level] || 0) + 1;
      }
      continue;
    }
    if (!isSub) {
      sessions++;
      if (!byLevel.has(level)) byLevel.set(level, { sessions: 0, usage: emptyUsage() });
      byLevel.get(level).sessions++;
      for (const r of requests) addUsage(byLevel.get(level).usage, r.usage);
      const first = requests[0].usage;
      startup.push(first.input + first.write5m + first.write1h + first.read);
      if (requests.length > LONG_SESSION) longSessions.push({ file: rel, requests: requests.length });
    }
    for (const r of requests) {
      addUsage(total, r.usage);
      addUsage(byKind[isSub ? 'subagent' : 'main'], r.usage);
      if (!byModel.has(r.model)) byModel.set(r.model, emptyUsage());
      addUsage(byModel.get(r.model), r.usage);
      if (!byProject.has(project)) byProject.set(project, emptyUsage());
      addUsage(byProject.get(project), r.usage);
      const written = r.usage.write5m + r.usage.write1h;
      if (r.index > 0 && written >= REBUILD_MIN) {
        rebuild.count++;
        rebuild.weighted += r.usage.write5m * W.write5m + r.usage.write1h * W.write1h;
        const prev = requests[r.index - 1];
        if (prev && r.ts - prev.ts > 5 * 60e3) rebuild.idle++;
      }
    }
    const ends = [...boundaries, requests.length].sort((a, b) => a - b);
    for (const res of results) {
      const tu = toolUses.get(res.id) || { name: 'unknown', label: '' };
      const tokens = res.chars / CHARS_PER_TOKEN;
      const end = ends.find((b) => b > res.at) || requests.length;
      const reads = Math.max(0, end - res.at - 1);
      const rent = tokens * (W.write5m + W.read * reads);
      const name = tu.name && tu.name.startsWith('mcp__') ? tu.name.split('__').slice(0, 2).join('__') + '__*' : tu.name;
      if (!byTool.has(name)) byTool.set(name, { calls: 0, tokens: 0, rent: 0 });
      const t = byTool.get(name);
      t.calls++; t.tokens += tokens; t.rent += rent;
      big.push({ tool: tu.name, tokens, rent, label: tu.label, file: rel });
      if (res.text != null) {
        sim.calls++;
        sim.rentBefore += rent;
        const s = squash(res.text, { mode: classify(res.command) });
        if (!s.changed) continue;
        const saved = (res.text.length - s.text.length) / CHARS_PER_TOKEN;
        sim.squashed++;
        sim.tokensSaved += saved;
        sim.rentSaved += saved * (W.write5m + W.read * reads);
      }
    }
  }

  if (cut) return printCompare(args, periods);

  const totalW = weighted(total);
  const toolRent = [...byTool.values()].reduce((n, t) => n + t.rent, 0);
  const squashStats = readSquashStats(since);
  big.sort((a, b) => b.rent - a.rent);

  const summary = {
    days: args.days, files: files.length, sessions, total, weightedTotal: totalW,
    byModel: Object.fromEntries([...byModel].map(([k, u]) => [k, { ...u, weighted: weighted(u) }])),
    byProject: Object.fromEntries([...byProject].map(([k, u]) => [k, { ...u, weighted: weighted(u) }])),
    byKind: { main: { ...byKind.main, weighted: weighted(byKind.main) }, subagent: { ...byKind.subagent, weighted: weighted(byKind.subagent) } },
    tools: Object.fromEntries(byTool), toolRent, topResults: big.slice(0, args.top),
    startupMedian: median(startup), startupMax: Math.max(0, ...startup),
    rebuild, longSessions, squash: squashStats, simulate: args.simulate ? sim : undefined,
  };
  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (!total.requests) {
    console.log(`No requests found in ${root} for the last ${args.days} days.`);
    return;
  }

  const out = [];
  out.push(`Token report — last ${args.days} days · ${sessions} sessions · ${files.length} transcript files · ${fmt(total.requests)} API requests`);
  out.push('Weighted = input-token equivalents (input ×1, cache write ×1.25 / ×2 for 1h, cache read ×0.1, output ×5).\n');

  const cat = [
    ['input (uncached)', total.input, total.input * W.input],
    ['cache write', total.write5m + total.write1h, total.write5m * W.write5m + total.write1h * W.write1h],
    ['cache read', total.read, total.read * W.read],
    [`output (thinking ${pct(total.thinking, total.output)})`, total.output, total.output * W.output],
  ];
  out.push(table(cat.map(([n, t, w]) => [n, fmt(t), fmt(w), pct(w, totalW)]), ['category', 'tokens', 'weighted', 'share']));

  out.push('\nBy model:');
  out.push(table([...byModel].sort((a, b) => weighted(b[1]) - weighted(a[1]))
    .map(([m, u]) => [m, fmt(u.requests), fmt(weighted(u)), pct(weighted(u), totalW)]), ['model', 'requests', 'weighted', 'share']));

  out.push('\nMain conversation vs subagents:');
  out.push(table(Object.entries(byKind).map(([k, u]) => [k, fmt(u.requests), fmt(weighted(u)), pct(weighted(u), totalW)]), ['kind', 'requests', 'weighted', 'share']));

  if (byProject.size > 1) {
    out.push('\nBy project:');
    out.push(table([...byProject].sort((a, b) => weighted(b[1]) - weighted(a[1])).slice(0, args.top)
      .map(([p, u]) => [p, fmt(u.requests), fmt(weighted(u)), pct(weighted(u), totalW)]), ['project', 'requests', 'weighted', 'share']));
  }

  if ([...byLevel.keys()].some((l) => l !== 'none')) {
    out.push('\nBy tokenfisher level (main sessions, from the policy each session started with):');
    out.push(table([...byLevel].sort((a, b) => weighted(b[1].usage) - weighted(a[1].usage))
      .map(([l, v]) => [l, v.sessions, fmt(v.usage.requests), fmt(weighted(v.usage) / Math.max(1, v.usage.requests)), pct(weighted(v.usage), totalW)]),
    ['level', 'sessions', 'requests', 'weighted/request', 'share']));
  }

  out.push(`\nStartup context (first request of each session): median ${fmt(summary.startupMedian)}, max ${fmt(summary.startupMax)} tokens`);
  out.push(`Cache rebuilds (≥${fmt(REBUILD_MIN)} tokens written mid-session): ${rebuild.count} requests, ${fmt(rebuild.weighted)} weighted (${pct(rebuild.weighted, totalW)}); ${rebuild.idle} after a >5 min pause`);

  out.push(`\nTool results — rent = cache write + 0.1 × every later request that re-reads it (est. ${CHARS_PER_TOKEN} chars/token):`);
  out.push(table([...byTool].sort((a, b) => b[1].rent - a[1].rent).slice(0, args.top)
    .map(([n, t]) => [n, t.calls, fmt(t.tokens), fmt(t.rent), pct(t.rent, totalW)]), ['tool', 'calls', 'tokens', 'rent', 'share']));
  out.push(`All tool results together: ${fmt(toolRent)} weighted ≈ ${pct(toolRent, totalW)} of everything.`);

  out.push(`\nTop ${args.top} tool results by rent:`);
  out.push(table(big.slice(0, args.top).map((b) => [b.tool, fmt(b.tokens), fmt(b.rent), b.label.slice(0, 60)]), ['tool', 'tokens', 'rent', 'call']));

  if (longSessions.length) {
    out.push(`\nLong sessions (>${LONG_SESSION} requests): ${longSessions.length} — ${longSessions.slice(0, 5).map((s) => `${s.file} (${s.requests})`).join(', ')}`);
  }
  if (squashStats.calls) {
    const saved = (squashStats.before - squashStats.after) / CHARS_PER_TOKEN;
    out.push(`\ntokenfisher squash: ${squashStats.calls} outputs compressed, ${fmt(squashStats.before / CHARS_PER_TOKEN)} → ${fmt(squashStats.after / CHARS_PER_TOKEN)} tokens (−${fmt(saved)} at first write, more as rent)`);
  }

  if (args.simulate) {
    out.push(`\nSimulation — squash filter replayed over ${sim.calls} past shell outputs: ${sim.squashed} would be rewritten, `
      + `−${fmt(sim.tokensSaved)} tokens, −${fmt(sim.rentSaved)} weighted rent `
      + `(${pct(sim.rentSaved, sim.rentBefore)} of shell-output rent, ${pct(sim.rentSaved, totalW)} of everything).`);
  }

  const tips = [];
  if (toolRent / totalW > 0.25) tips.push('Tool output is a big share: keep the squash hook on; send log/test/doc-heavy work to a subagent; read files with offset/limit.');
  if (summary.startupMedian > 30000) tips.push(`Startup context is ${fmt(summary.startupMedian)}: run /context, trim CLAUDE.md (<200 lines), move workflows into skills, disable unused MCP servers.`);
  if (rebuild.weighted / totalW > 0.15) tips.push('Cache rebuilds are costly: avoid long idle gaps mid-task, avoid toggling MCP servers/models mid-session, /clear instead of resuming stale sessions.');
  if (longSessions.length) tips.push('Long sessions re-read their whole history on every request: /clear between unrelated tasks, /compact with focus instructions when continuing.');
  if (total.output * W.output / totalW > 0.35) tips.push('Output is a big share: lower /effort for routine tasks; ask for concise answers.');
  const topModel = [...byModel].sort((a, b) => weighted(b[1]) - weighted(a[1]))[0];
  if (topModel && /opus|fable/i.test(topModel[0]) && weighted(topModel[1]) / totalW > 0.7) tips.push(`${topModel[0]} carries most of the cost: use Sonnet for routine work and set model: haiku/sonnet on exploration subagents.`);
  if (tips.length) out.push('\nSuggestions:\n' + tips.map((t) => `- ${t}`).join('\n'));

  console.log(out.join('\n'));
}

// The account each session ran on, from tokenfisher's SessionStart log (sessions started before it was installed are unknown).
function readSessionLog() {
  const home = process.env.TOKENFISHER_HOME || path.join(os.homedir(), '.claude', 'tokenfisher');
  const map = new Map();
  try {
    for (const line of fs.readFileSync(path.join(home, 'sessions.jsonl'), 'utf8').split('\n')) {
      if (!line) continue;
      try { const o = JSON.parse(line); if (!map.has(o.session)) map.set(o.session, o); } catch { /* skip */ }
    }
  } catch { /* no log yet */ }
  return map;
}

async function monthReport(args, root) {
  const start = new Date(`${args.month}-01T00:00:00`);
  if (!/^\d{4}-\d{2}$/.test(args.month) || !Number.isFinite(start.getTime())) throw new Error(`--month needs a month like 2026-10, got "${args.month}"`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime();
  const log = readSessionLog();
  let files = walk(root).filter((f) => fs.statSync(f).mtimeMs >= start.getTime());
  if (args.project) files = files.filter((f) => path.relative(root, f).split(path.sep)[0].toLowerCase().includes(args.project.toLowerCase()));
  const total = emptyUsage();
  const groups = { account: new Map(), source: new Map(), model: new Map(), project: new Map(), level: new Map() };
  const add = (g, key, u) => { if (!groups[g].has(key)) groups[g].set(key, emptyUsage()); addUsage(groups[g].get(key), u); };
  const sessionsBy = { account: new Map(), source: new Map(), level: new Map() };
  const countSession = (g, key) => sessionsBy[g].set(key, (sessionsBy[g].get(key) || 0) + 1);
  let sessions = 0;
  const parents = new Map(); // session id -> { level, entrypoint } of the main transcript, for its subagents
  const parsed = [];
  for (const file of files) parsed.push({ file, ...(await parseFile(file, false)) });
  for (const p of parsed) {
    const rel = path.relative(root, p.file).split(path.sep);
    if (!rel.includes('subagents')) parents.set(path.basename(p.file, '.jsonl'), { level: p.level, entrypoint: p.entrypoint });
  }
  for (const { file, requests, level, entrypoint } of parsed) {
    const rel = path.relative(root, file).split(path.sep);
    const isSub = rel.includes('subagents');
    const id = isSub ? rel[rel.indexOf('subagents') - 1] : path.basename(file, '.jsonl');
    const parent = parents.get(id) || {};
    const acct = log.get(id);
    const keys = {
      account: acct ? `${acct.account}${acct.plan ? ` (${acct.plan})` : ''}` : 'unknown (before session logging)',
      source: (isSub ? parent.entrypoint : entrypoint) || 'unknown',
      level: isSub ? parent.level || 'none' : level,
      project: rel[0],
    };
    const inMonth = requests.filter((r) => r.ts >= start.getTime() && r.ts < end);
    if (!inMonth.length) continue;
    if (!isSub && requests[0].ts >= start.getTime() && requests[0].ts < end) {
      sessions++;
      for (const g of ['account', 'source', 'level']) countSession(g, keys[g]);
    }
    for (const r of inMonth) {
      addUsage(total, r.usage);
      add('account', keys.account, r.usage);
      add('source', keys.source, r.usage);
      add('level', keys.level, r.usage);
      add('project', keys.project, r.usage);
      add('model', r.model, r.usage);
    }
  }
  const totalW = weighted(total);
  const sorted = (g) => [...groups[g]].sort((a, b) => weighted(b[1]) - weighted(a[1]));
  if (args.json) {
    const obj = (g) => Object.fromEntries(sorted(g).map(([k, u]) => [k, { ...u, weighted: weighted(u), sessions: sessionsBy[g] ? sessionsBy[g].get(k) || 0 : undefined }]));
    console.log(JSON.stringify({ month: args.month, sessions, total: { ...total, weighted: totalW }, byAccount: obj('account'), bySource: obj('source'), byModel: obj('model'), byProject: obj('project'), byLevel: obj('level') }, null, 2));
    return;
  }
  if (!total.requests) {
    console.log(`No requests found in ${root} for ${args.month}.`);
    return;
  }
  const out = [`Monthly report — ${args.month} · ${sessions} sessions · ${fmt(total.requests)} API requests · ${fmt(totalW)} weighted`];
  out.push('Weighted = input-token equivalents (input ×1, cache write ×1.25 / ×2 for 1h, cache read ×0.1, output ×5).\n');
  out.push(table([
    ['input (uncached)', fmt(total.input), fmt(total.input * W.input), pct(total.input * W.input, totalW)],
    ['cache write', fmt(total.write5m + total.write1h), fmt(total.write5m * W.write5m + total.write1h * W.write1h), pct(total.write5m * W.write5m + total.write1h * W.write1h, totalW)],
    ['cache read', fmt(total.read), fmt(total.read * W.read), pct(total.read * W.read, totalW)],
    ['output', fmt(total.output), fmt(total.output * W.output), pct(total.output * W.output, totalW)],
  ], ['category', 'tokens', 'weighted', 'share']));
  const section = (title, g, name, withSessions) => {
    out.push(`\n${title}:`);
    out.push(table(sorted(g).slice(0, g === 'project' ? args.top : undefined).map(([k, u]) => [k, ...(withSessions ? [sessionsBy[g].get(k) || 0] : []), fmt(u.requests), fmt(weighted(u)), pct(weighted(u), totalW)]),
      [name, ...(withSessions ? ['sessions'] : []), 'requests', 'weighted', 'share']));
  };
  section('By account (claude.ai login, API key or CLAUDE_CODE_OAUTH_TOKEN; keys and tokens show as a short hash)', 'account', 'account', true);
  section('By source', 'source', 'source', true);
  section('By model', 'model', 'model', false);
  section('By tokenfisher level', 'level', 'level', true);
  section('By project', 'project', 'project', false);
  if (groups.account.has('unknown (before session logging)')) out.push('\nSessions started before tokenfisher 0.4.0 have no account record; they show as unknown.');
  console.log(out.join('\n'));
}

function newPeriod() {
  return { total: emptyUsage(), main: emptyUsage(), sub: emptyUsage(), opus: emptyUsage(), lengths: [], levels: {} };
}

// --compare: the same measures for the --days before the date and the --days from it on.
// Per-request and per-session figures matter more than totals, which follow how much work there was.
function printCompare(args, periods) {
  const day = (t) => new Date(t).toLocaleDateString('sv'); // local YYYY-MM-DD
  const cut = new Date(`${args.compare}T00:00:00`).getTime();
  const rows = [
    ['requests', (p) => p.total.requests, fmt],
    ['sessions', (p) => p.lengths.length, String],
    ['weighted total', (p) => weighted(p.total), fmt],
    ['weighted / request', (p) => weighted(p.total) / Math.max(1, p.total.requests), fmt],
    ['weighted / session', (p) => weighted(p.total) / Math.max(1, p.lengths.length), fmt],
    ['median requests / session', (p) => median(p.lengths), String],
    ['Opus/Fable share', (p) => weighted(p.opus) / Math.max(1, weighted(p.total)), (v) => `${(100 * v).toFixed(1)}%`],
    ['cache read share', (p) => p.total.read * W.read / Math.max(1, weighted(p.total)), (v) => `${(100 * v).toFixed(1)}%`],
    ['output share', (p) => p.total.output * W.output / Math.max(1, weighted(p.total)), (v) => `${(100 * v).toFixed(1)}%`],
    ['subagent share', (p) => weighted(p.sub) / Math.max(1, weighted(p.total)), (v) => `${(100 * v).toFixed(1)}%`],
  ];
  const summary = Object.fromEntries(rows.map(([name, f]) => [name, { before: f(periods.before), after: f(periods.after) }]));
  if (args.json) {
    console.log(JSON.stringify({ compare: args.compare, days: args.days, measures: summary, levels: { before: periods.before.levels, after: periods.after.levels } }, null, 2));
    return;
  }
  const change = (a, b) => (a ? `${b >= a ? '+' : '−'}${Math.abs(100 * (b - a) / a).toFixed(1)}%` : '–');
  const out = [`Before vs after ${args.compare} · ${day(cut - args.days * 864e5)} → ${args.compare} vs ${args.compare} → ${day(Math.min(Date.now(), cut + args.days * 864e5))}`];
  out.push('Weighted = input-token equivalents (input ×1, cache write ×1.25 / ×2 for 1h, cache read ×0.1, output ×5).\n');
  out.push(table(rows.map(([name, f, show]) => {
    const a = f(periods.before);
    const b = f(periods.after);
    return [name, show(a), show(b), name.includes('share') ? `${b >= a ? '+' : '−'}${Math.abs(100 * (b - a)).toFixed(1)} pts` : change(a, b)];
  }), ['measure', 'before', 'after', 'change']));
  const lv = (p) => Object.entries(p.levels).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${n}`).join(', ') || '–';
  out.push(`\nSessions by tokenfisher level — before: ${lv(periods.before)}; after: ${lv(periods.after)}`);
  out.push('Totals follow how much you worked; compare the per-request and per-session lines.');
  console.log(out.join('\n'));
}

module.exports = { normUsage };

if (require.main === module) main().catch((e) => { console.error(e.stack || String(e)); process.exitCode = 1; });
