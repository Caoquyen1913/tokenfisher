'use strict';

const path = require('path');

const PLUGIN_ROOT = path.join(__dirname, '..');
const { LEVELS, settingsObject } = require('../lib/level');
const CORE_TOOLS = 'Bash,PowerShell,Read,Edit,Write,Glob,Grep';

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
// your vault/boards from temp dirs; built-in skills/agents, MCP servers and connectors still load.
function commonArgs({ budget }) {
  return [
    // stream-json keeps every tool call and result as evidence; the last line is the usual result object.
    '-p', '--output-format', 'stream-json', '--verbose', '--no-session-persistence',
    '--setting-sources', 'project,local',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Bash', 'PowerShell', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'Agent', 'Task',
    '--max-budget-usd', String(budget),
  ];
}

// Ablation ladder, cheapest last. Measured one-request prefixes (headless, warm):
// Opus all tools 40.8k · --strict-mcp-config 35.2k · 7 core tools 11.2k · max profile 13.4k.
// (--disable-slash-commands grew the prefix to 47.1k, so no arm uses it.)
function arms({ model }) {
  const diet = ['--plugin-dir', PLUGIN_ROOT, '--strict-mcp-config', '--append-system-prompt', LEAN_PROMPT];
  const core = [...diet, '--tools', CORE_TOOLS];
  return {
    A: { label: 'baseline', describe: `Claude Code defaults (${model}): all built-in tools, built-in skills and agents, your MCP servers and claude.ai connectors`, args: ['--model', model] },
    B: { label: 'tokenfisher', describe: `${model} + output hook + no MCP/connectors + lean-reading prompt`, args: ['--model', model, ...diet] },
    T: { label: 'core tools', describe: `${model} + B + only the 7 core tools (${CORE_TOOLS})`, args: ['--model', model, ...core] },
    S: { label: 'core tools + sonnet', describe: 'T with the model routed to Sonnet', args: ['--model', 'sonnet', ...core] },
    L: { label: 'core tools + sonnet + low effort', describe: 'S with --effort low', args: ['--model', 'sonnet', ...core, '--effort', 'low'] },
    // The plugin as users install it. Since 0.3.0 the plugin itself runs the main thread on Sonnet
    // (agents/main.md), so arms that pass --plugin-dir also get its SessionStart policy; --model still wins.
    P: {
      label: 'tokenfisher plugin',
      describe: 'tokenfisher plugin, zero flags: Sonnet main thread with every tool, Opus escalation agent, Haiku scout, policy, output hook',
      args: ['--plugin-dir', PLUGIN_ROOT],
    },
    Q: {
      label: 'plugin + advisor',
      describe: 'P with advisorModel opus: the Sonnet main thread can consult Opus, which reads the whole transcript',
      args: ['--plugin-dir', PLUGIN_ROOT, '--settings', JSON.stringify({ advisorModel: 'opus' })],
    },
    // One arm per /tokenfisher:set level: the settings it writes go in via --settings, the level itself via env.
    // low keeps "your" model, which here is the baseline's (--model).
    ...Object.fromEntries(Object.keys(LEVELS).map((name) => [name.toUpperCase(), {
      label: `level ${name}`,
      describe: `tokenfisher plugin at /tokenfisher:set ${name}: ${LEVELS[name].summary}`,
      args: ['--plugin-dir', PLUGIN_ROOT, '--settings', JSON.stringify(settingsObject(name)), ...(name === 'low' ? ['--model', model] : [])],
      env: { TOKENFISHER_LEVEL: name },
    }])),
    C: { label: 'tokenfisher + sonnet', describe: 'B with model routed to Sonnet', args: ['--model', 'sonnet', ...diet] },
    D: { label: 'tokenfisher + effort medium', describe: `B (${model}) with --effort medium`, args: ['--model', model, ...diet, '--effort', 'medium'] },
  };
}

module.exports = { arms, commonArgs, LEAN_PROMPT, CORE_TOOLS };
