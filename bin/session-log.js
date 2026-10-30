#!/usr/bin/env node
'use strict';

// SessionStart hook: records which account or credential each session runs on, so token-report --month can
// split usage by account. Transcripts don't say. Writes one line per session start to
// ~/.claude/tokenfisher/sessions.jsonl. Never stores a key or token: only a short hash to tell them apart.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const HOME = process.env.TOKENFISHER_HOME || path.join(os.homedir(), '.claude', 'tokenfisher');
const LOG = path.join(HOME, 'sessions.jsonl');
const CLAUDE_JSON = process.env.TOKENFISHER_CLAUDE_JSON || path.join(os.homedir(), '.claude.json');

const tag = (secret) => crypto.createHash('sha256').update(secret).digest('hex').slice(0, 8);

// Same order Claude Code uses: a cloud provider, then an API key, then an OAuth token, then the claude.ai login.
function credential(env = process.env) {
  if (env.CLAUDE_CODE_USE_BEDROCK === '1') return { auth: 'bedrock', account: `bedrock ${env.AWS_PROFILE || env.AWS_REGION || ''}`.trim() };
  if (env.CLAUDE_CODE_USE_VERTEX === '1') return { auth: 'vertex', account: `vertex ${env.ANTHROPIC_VERTEX_PROJECT_ID || ''}`.trim() };
  if (env.ANTHROPIC_API_KEY) return { auth: 'api-key', account: `api-key #${tag(env.ANTHROPIC_API_KEY)}` };
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return { auth: 'oauth-token', account: `CLAUDE_CODE_OAUTH_TOKEN #${tag(env.CLAUDE_CODE_OAUTH_TOKEN)}` };
  try {
    const a = JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf8')).oauthAccount || {};
    if (a.emailAddress) return { auth: 'claude.ai', account: a.emailAddress, org: a.organizationName, plan: a.billingType };
  } catch { /* not logged in, or the file moved */ }
  return { auth: 'unknown', account: 'unknown' };
}

function readStdin() {
  return new Promise((resolve) => {
    let s = '';
    process.stdin.on('data', (d) => { s += d; }).on('end', () => resolve(s));
  });
}

async function main() {
  if (process.env.TOKENFISHER_DISABLE === '1') return;
  const input = JSON.parse(await readStdin());
  if (!input.session_id) return;
  fs.mkdirSync(HOME, { recursive: true });
  fs.appendFileSync(LOG, JSON.stringify({ session: input.session_id, ts: new Date().toISOString(), source: input.source, ...credential() }) + '\n');
}

module.exports = { credential };

if (require.main === module) main().catch(() => {}).finally(() => { process.exitCode = 0; });
