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
    else if (k === '-h' || k === '--help') {
      console.log('node token-report.js [--days 7] [--project <substr>] [--session <id>] [--top 10] [--simulate] [--json] [--dir <projects dir>]');
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
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
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
  return { requests: [...requests.values()], toolUses, results, boundaries };
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
  const since = Date.now() - args.days * 864e5;
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
  let sessions = 0;

  for (const file of files) {
    const { requests, toolUses, results, boundaries } = await parseFile(file, args.simulate);
    if (!requests.length) continue;
    const rel = path.relative(root, file);
    const project = rel.split(path.sep)[0];
    const isSub = rel.split(path.sep).includes('subagents');
    if (!isSub) {
      sessions++;
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

module.exports = { normUsage };

if (require.main === module) main().catch((e) => { console.error(e.stack || String(e)); process.exitCode = 1; });
