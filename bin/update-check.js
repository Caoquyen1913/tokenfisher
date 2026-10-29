#!/usr/bin/env node
'use strict';

// SessionStart hook: at most once a day, compares the installed version with the one on GitHub
// and tells the user (not Claude) when a newer one is out. Any network or file error stays silent.
// Off with TOKENFISHER_NO_UPDATE_CHECK=1 or TOKENFISHER_DISABLE=1.

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = process.env.TOKENFISHER_HOME || path.join(os.homedir(), '.claude', 'tokenfisher');
const STATE = path.join(HOME, 'update.json');
const URL = process.env.TOKENFISHER_UPDATE_URL
  || 'https://raw.githubusercontent.com/Caoquyen1913/tokenfisher/main/.claude-plugin/plugin.json';
const DAY = 24 * 3600e3;

function newer(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function main() {
  if (process.env.TOKENFISHER_DISABLE === '1' || process.env.TOKENFISHER_NO_UPDATE_CHECK === '1') return;
  let last = 0;
  try { last = JSON.parse(fs.readFileSync(STATE, 'utf8')).checked || 0; } catch { /* first run */ }
  if (Date.now() - last < DAY) return;

  // Stamp before fetching, so an offline machine also waits a day before the next try.
  fs.mkdirSync(HOME, { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify({ checked: Date.now() }));
  const installed = require('../.claude-plugin/plugin.json').version;
  const res = await fetch(URL, { signal: AbortSignal.timeout(1500) });
  const latest = (await res.json()).version;
  if (newer(latest, installed)) {
    process.stdout.write(JSON.stringify({
      systemMessage: `tokenfisher ${latest} is out (you have ${installed}). Update with: /plugin marketplace update tokenfisher`,
    }));
  }
}

module.exports = { newer };

if (require.main === module) main().catch(() => {}).finally(() => { process.exitCode = 0; });
