#!/usr/bin/env node
'use strict';

// PostToolUse hook for Bash|PowerShell. The command has already run unchanged
// (permissions, cwd and exit code are untouched); this only rewrites what
// Claude reads. The full original output is saved so Claude can Read it back.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { squash, classify } = require('../lib/squash');

const HOME = process.env.TOKENFISHER_HOME || path.join(os.homedir(), '.claude', 'tokenfisher');
const RAW_DIR = path.join(HOME, 'raw');
const STATS = path.join(HOME, 'stats.jsonl');
const KEEP_RAW_FILES = 300;

// Commands are copied into stats and raw files; keep inline credentials out of them.
function redact(command) {
  return command.replace(/((?:pass(?:word)?|pwd|token|secret|api_?key|auth)\w*\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/gi, '$1***');
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
  });
}

function pruneRaw() {
  const files = fs.readdirSync(RAW_DIR)
    .map((f) => ({ f, t: fs.statSync(path.join(RAW_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of files.slice(KEEP_RAW_FILES)) fs.rmSync(path.join(RAW_DIR, f), { force: true });
}

function saveRaw(id, command, stdout, stderr) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(RAW_DIR, `${stamp}-${String(id).replace(/[^\w-]/g, '').slice(-12)}.txt`);
  const body = [`$ ${redact(command)}`, '', '=== stdout ===', stdout || '', '', '=== stderr ===', stderr || ''].join('\n');
  fs.writeFileSync(file, body, 'utf8');
  pruneRaw();
  return file;
}

async function main() {
  if (process.env.TOKENFISHER_DISABLE === '1') return;
  const input = JSON.parse(await readStdin());
  const res = input.tool_response;
  const command = (input.tool_input && input.tool_input.command) || '';
  if (!res || typeof res !== 'object' || res.isImage) return;
  if (typeof res.stdout !== 'string' && typeof res.stderr !== 'string') return;
  const mode = classify(command);
  if (mode === 'pass') return;

  const out = squash(res.stdout || '', { mode });
  const err = squash(res.stderr || '', { mode });
  if (!out.changed && !err.changed) return;

  const before = (res.stdout || '').length + (res.stderr || '').length;
  const omitted = out.omittedLines + err.omittedLines;
  let stdout = out.text;
  if (omitted) {
    const raw = saveRaw(input.tool_use_id || 'x', command, res.stdout, res.stderr);
    stdout += `\n[tokenfisher: ${omitted} lines omitted; full output saved at ${raw} — Read it only if the omitted part matters]`;
  }
  const after = stdout.length + err.text.length;

  try {
    fs.mkdirSync(HOME, { recursive: true });
    fs.appendFileSync(STATS, JSON.stringify({
      ts: new Date().toISOString(),
      session: input.session_id,
      tool: input.tool_name,
      cmd: redact(command).slice(0, 160),
      mode,
      before,
      after,
      omitted,
    }) + '\n');
  } catch { /* stats are best-effort */ }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      updatedToolOutput: { ...res, stdout, stderr: err.text },
    },
  }));
}

// Never break a tool call: on any failure, emit nothing and let the original through.
// No process.exit(): it can cut off a pending stdout write on Windows pipes.
main().catch(() => {}).finally(() => { process.exitCode = 0; });
