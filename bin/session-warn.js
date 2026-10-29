#!/usr/bin/env node
'use strict';

// UserPromptSubmit hook. Warns when a session has become expensive to keep going:
// - its context passed TOKENFISHER_WARN_TOKENS (default 80k), then every further +40k:
//   every tool result in it is re-billed on each later turn;
// - the prompt arrives after the prompt cache expired (5 min, or 1h when the session
//   writes 1h cache), so this turn rewrites the whole prefix to cache.
// Reads only the tail of the transcript, so it stays fast on huge sessions.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { normUsage } = require('./token-report');

const HOME = process.env.TOKENFISHER_HOME || path.join(os.homedir(), '.claude', 'tokenfisher');
const STATE_DIR = path.join(HOME, 'warn');
const STEP = 40000;
const FIRST_CHUNK = 64 * 1024;
const MAX_CHUNK = 16 * 1024 * 1024;

function threshold() {
  const n = Number(process.env.TOKENFISHER_WARN_TOKENS);
  return Number.isFinite(n) && process.env.TOKENFISHER_WARN_TOKENS !== '' ? n : 80000;
}

// Last API request in the current context: { size, ts, ttlMin }, or null when there is
// none since the last /compact (context size unknown until the next request).
function lastRequest(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const end = fs.fstatSync(fd).size;
    for (let len = FIRST_CHUNK; ; len *= 2) {
      const start = Math.max(0, end - len);
      const buf = Buffer.alloc(end - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      const lines = buf.toString('utf8').split('\n');
      if (start > 0) lines.shift(); // partial line
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i].includes('"usage"') && !lines[i].includes('compact_boundary')) continue;
        let o;
        try { o = JSON.parse(lines[i]); } catch { continue; }
        if (o.type === 'system' && o.subtype === 'compact_boundary') return null;
        const m = o.message;
        if (o.type !== 'assistant' || !m || !m.usage || m.model === '<synthetic>') continue;
        const u = normUsage(m.usage);
        // ponytail: TTL read from the last request only; a request with no cache write counts as 5 min.
        return { size: u.input + u.write5m + u.write1h + u.read, ts: Date.parse(o.timestamp), ttlMin: u.write1h > 0 ? 60 : 5 };
      }
      if (start === 0 || len >= MAX_CHUNK) return null;
    }
  } finally {
    fs.closeSync(fd);
  }
}

// 0 below the threshold, then 1, 2, 3… at threshold, +STEP, +2×STEP…
function levelFor(size, limit) {
  return limit > 0 && size >= limit ? 1 + Math.floor((size - limit) / STEP) : 0;
}

function k(n) {
  return `${Math.round(n / 1000)}k`;
}

// Pure decision: which warnings to give and the level to remember for the session.
function check({ size, ts, ttlMin }, prevLevel, now, limit) {
  const msgs = [];
  const level = levelFor(size, limit);
  if (level > prevLevel) {
    msgs.push(`session is at ${k(size)} tokens; every tool result is re-billed on each later turn — /compact now, or /clear if switching tasks.`);
  }
  const idleMin = (now - ts) / 60e3;
  // Rebuilding a small prefix is cheap; only warn when the context is at least half the limit.
  if (limit > 0 && size >= limit / 2 && idleMin > ttlMin) {
    msgs.push(`${Math.round(idleMin)} min since the last request, past the ${ttlMin === 60 ? '1h' : '5 min'} prompt-cache TTL: this turn rewrites the whole ${k(size)}-token prefix to cache. Next time, /clear or /compact before coming back to a stale session.`);
  }
  return { level, msgs };
}

function readLevel(session) {
  try { return Number(fs.readFileSync(path.join(STATE_DIR, session), 'utf8')) || 0; } catch { return 0; }
}

function writeLevel(session, level) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, session), String(level));
  const old = Date.now() - 7 * 864e5;
  for (const f of fs.readdirSync(STATE_DIR)) {
    const p = path.join(STATE_DIR, f);
    if (fs.statSync(p).mtimeMs < old) fs.rmSync(p, { force: true });
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  if (process.env.TOKENFISHER_DISABLE === '1') return;
  const input = JSON.parse(await readStdin());
  if (!input.transcript_path || !fs.existsSync(input.transcript_path)) return;
  const req = lastRequest(input.transcript_path);
  if (!req) return;
  const session = String(input.session_id || path.basename(input.transcript_path, '.jsonl')).replace(/[^\w-]/g, '');
  const prev = readLevel(session);
  const { level, msgs } = check(req, prev, Date.now(), threshold());
  if (level !== prev) writeLevel(session, level);
  if (!msgs.length) return;
  const text = msgs.map((m) => `tokenfisher: ${m}`).join('\n');
  process.stdout.write(JSON.stringify({
    systemMessage: text,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `${text}\nThe user sees this warning too. If this prompt starts an unrelated task, suggest /clear in one line; otherwise just continue.`,
    },
  }));
}

module.exports = { lastRequest, levelFor, check };

// Never block a prompt: on any failure, emit nothing.
if (require.main === module) main().catch(() => {}).finally(() => { process.exitCode = 0; });
