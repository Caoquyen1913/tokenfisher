'use strict';

const path = require('path');

const PLUGIN_ROOT = path.join(__dirname, '..');

// Behavioural layer of tokenfisher: ~90 tokens, aimed at reads and re-reads, not at answer quality.
const LEAN_PROMPT = [
  'Token discipline (correctness first, then cost):',
  '- Locate before reading: Grep/Glob first, then Read only the files and line ranges you need (offset/limit for big files; never read a large log whole).',
  '- Do not re-read a file you already have in context unless it changed.',
  '- When output says "[tokenfisher: N lines omitted …]", Read the saved file only if the omitted part matters.',
  '- Run the tests after changing code; finish with a short summary of what changed and how it was verified.',
].join('\n');

// Every arm gets the same harness flags; only the listed differences vary.
// User-level settings are excluded in all arms so personal hooks don't write to
// your vault/boards from temp dirs; skills, agents, MCP servers and connectors still load.
function commonArgs({ budget }) {
  return [
    // stream-json keeps every tool call and result as evidence; the last line is the usual result object.
    '-p', '--output-format', 'stream-json', '--verbose', '--no-session-persistence',
    '--setting-sources', 'project,local',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Bash', 'PowerShell', 'Read', 'Edit', 'Write', 'Glob', 'Grep',
    '--max-budget-usd', String(budget),
  ];
}

// Measured on a one-request probe (opus, headless): --strict-mcp-config cut the
// prefix 40.8k → 35.2k; --disable-slash-commands *grew* it to 47.1k, so it is not used.
function arms({ model }) {
  const diet = ['--plugin-dir', PLUGIN_ROOT, '--strict-mcp-config', '--append-system-prompt', LEAN_PROMPT];
  return {
    A: { label: 'baseline', describe: `Claude Code defaults (${model}): built-in skills and agents, your MCP servers and claude.ai connectors loaded`, args: ['--model', model] },
    B: { label: 'tokenfisher', describe: `Same model (${model}) + tokenfisher output hook + no MCP/connectors + lean-reading prompt`, args: ['--model', model, ...diet] },
    C: { label: 'tokenfisher + sonnet', describe: 'B with model routed to Sonnet', args: ['--model', 'sonnet', ...diet] },
    D: { label: 'tokenfisher + effort medium', describe: `B (${model}) with --effort medium`, args: ['--model', model, ...diet, '--effort', 'medium'] },
  };
}

module.exports = { arms, commonArgs, LEAN_PROMPT };
