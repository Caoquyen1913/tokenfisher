#!/usr/bin/env node
'use strict';

// Breaks down the context every session pays for before you type anything:
// system prompt, skill listing, agent listing, MCP tool names and instructions,
// SessionStart hook output, CLAUDE.md / memory. Sizes come from what Claude
// Code recorded in the transcript, each entry is traced back to the file or
// plugin it came from, and the controllable ones are ranked by cost.
//
// Usage: node token-audit.js [--sessions 5] [--session <id>] [--project <substr>] [--json]

const fs = require('fs');
const path = require('path');
const os = require('os');

const CHARS_PER_TOKEN = 4;
const W_WRITE = 1.25;
const W_READ = 0.1;
const LONG_DESCRIPTION = 300;
const CLAUDE_MD_LINES = 200;

function parseArgs(argv) {
  const a = { sessions: 5, session: null, project: null, json: false, claudeDir: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--json') a.json = true;
    else if (k === '--sessions') a.sessions = Number(argv[++i]);
    else if (k === '--session') a.session = argv[++i];
    else if (k === '--project') a.project = argv[++i];
    else if (k === '--claude-dir') a.claudeDir = argv[++i];
    else if (k === '-h' || k === '--help') {
      console.log('node token-audit.js [--sessions 5] [--session <id>] [--project <substr>] [--json] [--claude-dir <~/.claude>]');
      process.exit(0);
    }
  }
  return a;
}

const tok = (chars) => chars / CHARS_PER_TOKEN;

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(Math.round(n));
}

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function home(claudeDir, p) {
  return p.startsWith(claudeDir) ? '~/.claude' + p.slice(claudeDir.length).replace(/\\/g, '/') : p;
}

// ---- transcript -------------------------------------------------------------

function readSession(file) {
  const s = {
    file, cwd: null, ts: null, first: null, requests: new Set(),
    snapshot: null, skills: null, agents: null, deferred: null, mcp: [], hooks: [], instructions: [], other: 0,
    laterHooks: new Map(),
  };
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (!s.cwd && o.cwd) s.cwd = o.cwd;
    if (!s.ts && o.timestamp) s.ts = o.timestamp;
    if (o.type === 'assistant' && o.message && o.message.usage && o.message.model !== '<synthetic>') {
      s.requests.add(o.message.id);
      if (!s.first) {
        const u = o.message.usage;
        s.first = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
      }
      continue;
    }
    if (o.type !== 'attachment' || !o.attachment) continue;
    const a = o.attachment;
    if (s.first) {
      // After startup only per-turn hook injections matter here.
      if (a.type === 'hook_additional_context') {
        const key = a.hookEvent || 'unknown';
        const h = s.laterHooks.get(key) || { count: 0, chars: 0 };
        h.count++; h.chars += hookText(a).length;
        s.laterHooks.set(key, h);
      }
      continue;
    }
    switch (a.type) {
      case 'prompt_snapshot': if (!s.snapshot) s.snapshot = a; break;
      case 'skill_listing': if (!s.skills) s.skills = a; break;
      case 'agent_listing_delta': if (!s.agents) s.agents = a; break;
      case 'deferred_tools_delta': if (!s.deferred) s.deferred = a; break;
      case 'mcp_instructions_delta': s.mcp.push(a); break;
      case 'hook_additional_context': s.hooks.push(a); break;
      case 'instructions': s.instructions.push(...(a.files || [])); break;
      case 'hook_success': break; // its output is counted via hook_additional_context
      default: s.other += JSON.stringify(a).length;
    }
  }
  return s;
}

function hookText(a) {
  return Array.isArray(a.content) ? a.content.join('\n') : String(a.content || '');
}

// ---- source resolution ------------------------------------------------------

function installedPlugins(claudeDir) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(claudeDir, 'plugins', 'installed_plugins.json'), 'utf8'));
    return new Set(Object.keys(j.plugins || {}).map((k) => k.split('@')[0]));
  } catch { return new Set(); }
}

function skillSource(name, ctx) {
  const { claudeDir, cwd, plugins } = ctx;
  const i = name.indexOf(':');
  if (i > 0) {
    const p = name.slice(0, i);
    if (p === 'anthropic-skills') return { group: 'claude.ai skills (synced to your account)', kind: 'account' };
    if (plugins.has(p)) return { group: `plugin ${p}`, kind: 'plugin', id: p };
    if (exists(path.join(claudeDir, 'commands', p))) return { group: `~/.claude/commands/${p}/`, kind: 'user-commands', id: p };
    if (cwd && exists(path.join(cwd, '.claude', 'commands', p))) return { group: `project .claude/commands/${p}/`, kind: 'project' };
    return { group: `plugin ${p}`, kind: 'plugin', id: p };
  }
  if (exists(path.join(claudeDir, 'skills', name))) return { group: '~/.claude/skills/', kind: 'user-skills' };
  if (exists(path.join(claudeDir, 'commands', name + '.md'))) return { group: '~/.claude/commands/', kind: 'user-commands' };
  if (cwd && exists(path.join(cwd, '.claude', 'skills', name))) return { group: 'project .claude/skills/', kind: 'project' };
  if (cwd && exists(path.join(cwd, '.claude', 'commands', name + '.md'))) return { group: 'project .claude/commands/', kind: 'project' };
  return { group: 'built-in skills', kind: 'builtin' };
}

function agentSource(type, ctx, builtIns) {
  const { claudeDir, cwd } = ctx;
  if (builtIns.has(type)) return { group: 'built-in agents', kind: 'builtin' };
  if (type.includes(':')) return { group: `plugin ${type.split(':')[0]} agents`, kind: 'plugin', id: type.split(':')[0] };
  const prefix = type.includes('-') ? type.split('-')[0] + '-*' : type;
  if (exists(path.join(claudeDir, 'agents', type + '.md'))) return { group: `~/.claude/agents/${prefix}`, kind: 'user-agents', id: prefix };
  if (cwd && exists(path.join(cwd, '.claude', 'agents', type + '.md'))) return { group: 'project .claude/agents/', kind: 'project' };
  return { group: 'built-in agents', kind: 'builtin' };
}

// Servers the desktop app wires in itself vs. claude.ai connectors (UUID names) vs. your own.
const APP_MCP = /^(?:ccd_\w+|Claude_Browser|visualize|terminal|mcp-registry|scheduled-tasks)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

function mcpSource(name) {
  if (APP_MCP.test(name)) return { group: `MCP ${name} (desktop app)`, kind: 'builtin' };
  if (UUID.test(name)) return { group: `claude.ai connector ${name.slice(0, 8)}…`, kind: 'connector', id: name };
  return { group: `MCP ${name}`, kind: 'mcp', id: name };
}

// Split the skill listing text into one segment per skill name.
function skillSegments(listing) {
  const content = listing.content || '';
  const names = listing.names || [];
  const pos = names
    .map((n) => ({ n, at: content.indexOf(`- ${n}:`) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at);
  return pos.map((x, i) => ({ name: x.n, chars: (i + 1 < pos.length ? pos[i + 1].at : content.length) - x.at }));
}

// ---- breakdown --------------------------------------------------------------

function breakdown(s, ctx) {
  const items = []; // { section, group, kind, chars, count, detail }
  const add = (section, group, kind, chars, extra = {}) => {
    let it = items.find((x) => x.section === section && x.group === group);
    if (!it) items.push(it = { section, group, kind, chars: 0, count: 0, ...extra });
    it.chars += chars; it.count++;
    return it;
  };

  if (s.snapshot && Array.isArray(s.snapshot.systemPrompt)) {
    for (const b of s.snapshot.systemPrompt) {
      if (typeof b !== 'string') continue;
      const kind = /^# Memory\b/.test(b) ? 'memory' : 'builtin';
      add('System prompt', kind === 'memory' ? 'auto-memory instructions' : 'Claude Code + app instructions', kind, b.length);
    }
  }

  if (s.skills) {
    for (const seg of skillSegments(s.skills)) {
      const src = skillSource(seg.name, ctx);
      const it = add('Skill listing', src.group, src.kind, seg.chars, { id: src.id, long: [] });
      if (seg.chars > LONG_DESCRIPTION && src.kind !== 'builtin') it.long.push({ name: seg.name, chars: seg.chars });
    }
  }

  if (s.agents) {
    const builtIns = new Set(s.agents.builtInTypes || []);
    (s.agents.addedTypes || []).forEach((t, i) => {
      const src = agentSource(t, ctx, builtIns);
      add('Agent listing', src.group, src.kind, ((s.agents.addedLines || [])[i] || '').length, { id: src.id });
    });
  }

  if (s.deferred) {
    for (const line of s.deferred.addedLines || []) {
      const m = /^mcp__([^_]+(?:_[^_]+)*?)__/.exec(line);
      const src = m ? mcpSource(m[1]) : { group: 'built-in deferred tools', kind: 'builtin' };
      add('Deferred tool names', src.group, src.kind, line.length + 1, { id: src.id });
    }
    const defs = s.deferred.surfacedDefinitions;
    if (defs) add('Tool definitions loaded up front', 'surfaced tool schemas', 'builtin', JSON.stringify(defs).length);
  }

  for (const d of s.mcp) {
    (d.addedNames || []).forEach((n, i) => {
      const src = mcpSource(n);
      add('MCP server instructions', src.group, src.kind, ((d.addedBlocks || [])[i] || '').length, { id: src.id });
    });
  }

  for (const h of s.hooks) {
    const text = hookText(h);
    const title = (text.replace(/<persisted-output>[\s\S]*?Preview[^\n]*\n/, '').split('\n').find((l) => l.trim()) || h.hookName || 'hook').slice(0, 60);
    add('SessionStart hook output', title, 'hook', text.length);
  }

  for (const f of s.instructions) {
    const lines = (f.content || '').split('\n').length;
    add('Instruction files', home(ctx.claudeDir, f.path || '?'), f.type === 'AutoMem' ? 'memory' : 'claude-md', (f.content || '').length, { lines });
  }

  if (s.other) add('Other attachments', 'environment, model, date, mode…', 'builtin', s.other);

  const known = items.reduce((n, x) => n + tok(x.chars), 0);
  const remainder = Math.max(0, (s.first || 0) - known);
  // Tool JSON schemas are not recorded in the transcript, so they are the remainder.
  items.push({ section: 'Tool schemas (remainder, not in transcript)', group: 'built-in + app tool schemas', kind: 'builtin', chars: remainder * CHARS_PER_TOKEN, count: 1 });
  return items;
}

const CONTROLLABLE = new Set(['user-commands', 'user-skills', 'user-agents', 'plugin', 'account', 'mcp', 'connector', 'hook', 'claude-md', 'project']);

function advice(it) {
  const n = it.count;
  switch (it.kind) {
    case 'user-commands':
      return `${n} global commands load in every project. Move ${it.group} into the projects that use it (<project>/.claude/commands/), or delete what you no longer run.`;
    case 'user-agents':
      return `${n} global agents load in every project. Move ${it.group}.md into <project>/.claude/agents/ where they are used.`;
    case 'user-skills': {
      const long = (it.long || []).sort((a, b) => b.chars - a.chars).slice(0, 4).map((l) => `${l.name} (${l.chars} chars)`);
      return `Shorten skill descriptions to one line about when to use the skill${long.length ? `; longest: ${long.join(', ')}` : ''}. Move project-specific skills into <project>/.claude/skills/.`;
    }
    case 'plugin':
      return `Disable plugin ${it.id} where you don't use it: /plugin → Installed → disable (or enable it per project in .claude/settings.json).`;
    case 'account':
      return `${n} skills synced from your claude.ai account. Turn off the ones you don't use in claude.ai skill settings.`;
    case 'mcp':
      return `Disable MCP ${it.id} with /mcp in projects that don't need it; prefer a CLI (gh, aws…) when one exists.`;
    case 'connector':
      return 'A claude.ai connector: turn it off in claude.ai connector settings (or the session\'s connector menu) if you don\'t use it.';
    case 'hook':
      return 'A SessionStart hook injects this every session. Trim what it prints, or have it print a pointer and let Claude read the file on demand.';
    case 'claude-md':
      return it.lines > CLAUDE_MD_LINES
        ? `${it.lines} lines: keep CLAUDE.md under ${CLAUDE_MD_LINES}; move workflow-specific parts into skills.`
        : 'Keep it lean; move workflow-specific parts into skills.';
    case 'project':
      return 'Project-level entry; fine if this project uses it.';
    default:
      return '';
  }
}

// ---- main -------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  const claudeDir = args.claudeDir || path.join(os.homedir(), '.claude');
  const root = path.join(claudeDir, 'projects');
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'subagents') walk(p); } else if (e.name.endsWith('.jsonl')) files.push(p);
    }
  })(root);
  let candidates = files
    .filter((f) => !args.project || path.relative(root, f).split(path.sep)[0].toLowerCase().includes(args.project.toLowerCase()))
    .filter((f) => !args.session || f.includes(args.session))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  const sessions = [];
  for (const f of candidates) {
    const s = readSession(f);
    // Older transcripts lack the startup snapshot; skip them.
    if (s.first && (s.skills || s.snapshot)) sessions.push(s);
    if (sessions.length >= args.sessions) break;
  }
  if (!sessions.length) {
    console.log('No session with a recorded startup context found.');
    return;
  }

  const plugins = installedPlugins(claudeDir);
  const newest = sessions[0];
  const items = breakdown(newest, { claudeDir, cwd: newest.cwd, plugins });
  const totalTokens = newest.first;
  const reqMedian = median(sessions.map((s) => s.requests.size));
  const perTokenPerSession = W_WRITE + W_READ * Math.max(0, reqMedian - 1);

  const laterHooks = new Map();
  for (const s of sessions) {
    for (const [k, v] of s.laterHooks) {
      const h = laterHooks.get(k) || { count: 0, chars: 0, sessions: 0 };
      h.count += v.count; h.chars += v.chars; h.sessions++;
      laterHooks.set(k, h);
    }
  }

  // One recommendation per MCP server, even though its names and instructions are separate items.
  const recMap = new Map();
  for (const it of items.filter((x) => CONTROLLABLE.has(x.kind) && x.kind !== 'project')) {
    // Tool prefixes and instruction blocks spell the same server differently ("claude_ai_Notion" / "claude.ai Notion").
    const norm = String(it.id).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const key = it.kind === 'mcp' || it.kind === 'connector' ? `mcp:${norm}` : `${it.section}:${it.group}`;
    const r = recMap.get(key);
    if (r) { r.chars += it.chars; continue; }
    recMap.set(key, { ...it });
  }
  const recs = [...recMap.values()].sort((a, b) => b.chars - a.chars);

  if (args.json) {
    console.log(JSON.stringify({
      session: path.relative(root, newest.file), cwd: newest.cwd, startupTokens: totalTokens,
      startupMedian: median(sessions.map((s) => s.first)), requestsMedian: reqMedian,
      items: items.map((it) => ({ ...it, tokens: Math.round(tok(it.chars)) })),
      laterHooks: Object.fromEntries(laterHooks),
    }, null, 2));
    return;
  }

  const out = [];
  out.push(`Startup context audit — newest of ${sessions.length} recent sessions: ${path.relative(root, newest.file)}`);
  out.push(`cwd ${newest.cwd || '?'} · ${newest.ts ? newest.ts.slice(0, 16).replace('T', ' ') : ''}`);
  out.push(`First request: ${fmt(totalTokens)} tokens (median over ${sessions.length} sessions: ${fmt(median(sessions.map((s) => s.first)))}).`);
  out.push(`Median session: ${reqMedian} requests → every 1k startup tokens costs ≈ ${fmt(1000 * perTokenPerSession)} weighted tokens per session (written once, re-read on each request).\n`);

  const sections = [...new Set(items.map((i) => i.section))]
    .map((sec) => ({ sec, items: items.filter((i) => i.section === sec) }))
    .map((x) => ({ ...x, chars: x.items.reduce((n, i) => n + i.chars, 0) }))
    .sort((a, b) => b.chars - a.chars);
  const w = 58;
  out.push(`${'component'.padEnd(w)} ${'tokens'.padStart(7)} ${'share'.padStart(6)}  you control`);
  for (const sec of sections) {
    out.push(`${sec.sec.padEnd(w)} ${fmt(tok(sec.chars)).padStart(7)} ${(100 * tok(sec.chars) / totalTokens).toFixed(1).padStart(5)}%`);
    if (sec.items.length === 1 && sec.items[0].group.length > w) continue;
    for (const it of [...sec.items].sort((a, b) => b.chars - a.chars)) {
      const label = `  ${it.group}${it.count > 1 ? ` (${it.count})` : ''}`.slice(0, w);
      out.push(`${label.padEnd(w)} ${fmt(tok(it.chars)).padStart(7)} ${(100 * tok(it.chars) / totalTokens).toFixed(1).padStart(5)}%  ${CONTROLLABLE.has(it.kind) ? 'yes' : 'no'}`);
    }
  }

  const controllable = recs.reduce((n, it) => n + tok(it.chars), 0);
  out.push(`\nYou control ≈ ${fmt(controllable)} of ${fmt(totalTokens)} startup tokens (${(100 * controllable / totalTokens).toFixed(0)}%); the rest is Claude Code itself.`);

  if (laterHooks.size) {
    out.push('\nHook output injected after startup (paid again on every later request):');
    for (const [k, h] of laterHooks) out.push(`  ${k}: ${h.count} injections, ${fmt(tok(h.chars))} tokens across ${h.sessions} sessions`);
  }

  out.push('\nRecommendations, biggest first (tokens per session start · ≈ weighted cost per median session):');
  recs.slice(0, 10).forEach((it, i) => {
    const t = tok(it.chars);
    out.push(`${String(i + 1).padStart(2)}. ${it.group} — ${fmt(t)} · ≈${fmt(t * perTokenPerSession)}`);
    out.push(`    ${advice(it)}`);
  });
  out.push('\nVerify after changes: start a new session, run /context, then re-run this audit.');
  console.log(out.join('\n'));
}

main();
