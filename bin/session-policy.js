#!/usr/bin/env node
'use strict';

// SessionStart hook: adds the tokenfisher working policy (~150 tokens) for the current level to the session.

const { config } = require('../lib/level');

function policy(level) {
  const lines = [
    `tokenfisher policy, level ${level.name} (correctness first, then cost):`,
    '- Locate before reading: Grep/Glob first, then Read only the files and line ranges you need; never read a large log whole.',
    '- Batch independent tool calls in one turn. Do not re-read a file you already have unless it changed.',
    '- Do the work in this thread. Spawn a subagent only to read a lot when you need just a summary, or to run independent parts in parallel; each subagent pays its own prompt and re-reads the code.',
  ];
  if (level.tieredSubagents) {
    lines.push("- When you spawn one, pick the cheapest model that fits via the Agent tool's model parameter: haiku to locate code or digest logs, sonnet for ordinary work.");
  }
  lines.push(
    '- Escalate to the tokenfisher:opus-architect agent for cross-module design, concurrency or security-sensitive logic, tricky spec edge cases, or a bug that survived two fix attempts. Use the tokenfisher:scout agent to digest large files or logs.',
    '- When output says "[tokenfisher: N lines omitted …]", Read the saved file only if the omitted part matters.',
    '- Run the tests after changing code; finish with a short summary of what changed and how it was verified.',
  );
  return lines.join('\n');
}

module.exports = { policy };

if (require.main === module) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: policy(config()) } }));
}
