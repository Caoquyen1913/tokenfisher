'use strict';

// tokenfisher levels: what /tokenfisher:set <level> changes, and what the hooks read at run time.
// `settings` are written into ~/.claude/settings.json by bin/set-level.js (dotted keys are nested paths).
// The rest is read by the hooks from ~/.claude/tokenfisher/level.json, or TOKENFISHER_LEVEL when set.

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = process.env.TOKENFISHER_HOME || path.join(os.homedir(), '.claude', 'tokenfisher');
const DEFAULT = 'high';
const SUBAGENT_SONNET = { 'env.CLAUDE_CODE_SUBAGENT_MODEL': 'sonnet' };
const STRONG_SQUASH = { fullLines: 40, fullChars: 4000, headLines: 10, tailLines: 25 };

const LEVELS = {
  low: {
    summary: 'Keeps your model and every tool; warnings, reports and output compression only.',
    warnTokens: 120000,
    squash: {},
    tieredSubagents: false,
    settings: { agent: 'tokenfisher:inherit' },
  },
  high: {
    summary: 'Sonnet main thread with every tool; compact at 200k; subagents on Sonnet.',
    warnTokens: 80000,
    squash: {},
    tieredSubagents: true,
    settings: { autoCompactWindow: 200000, ...SUBAGENT_SONNET },
  },
  ultra: {
    summary: 'high + low effort, compact at 150k, stronger output compression.',
    warnTokens: 60000,
    squash: STRONG_SQUASH,
    tieredSubagents: true,
    settings: { autoCompactWindow: 150000, effortLevel: 'low', ...SUBAGENT_SONNET },
  },
  promax: {
    summary: 'ultra + only the 7 core coding tools (no MCP or web tools), compact at 100k.',
    warnTokens: 50000,
    squash: STRONG_SQUASH,
    tieredSubagents: true,
    settings: { agent: 'tokenfisher:lean', autoCompactWindow: 100000, effortLevel: 'low', ...SUBAGENT_SONNET },
  },
};

function current() {
  const env = process.env.TOKENFISHER_LEVEL;
  if (LEVELS[env]) return env;
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(HOME, 'level.json'), 'utf8')).level;
    if (LEVELS[saved]) return saved;
  } catch { /* not set: default */ }
  return DEFAULT;
}

function config(name = current()) {
  return { name, ...LEVELS[name] };
}

// Dotted settings keys as a nested object, for `claude --settings` (used by the eval).
function settingsObject(name) {
  const out = {};
  for (const [key, value] of Object.entries(LEVELS[name].settings)) {
    const parts = key.split('.');
    let o = out;
    for (const p of parts.slice(0, -1)) o = o[p] = o[p] || {};
    o[parts[parts.length - 1]] = value;
  }
  return out;
}

module.exports = { LEVELS, DEFAULT, HOME, current, config, settingsObject };
