#!/usr/bin/env node
'use strict';

// SessionStart hook: adds the tokenfisher working policy (~120 tokens) to the session.

const POLICY = [
  'tokenfisher policy (correctness first, then cost):',
  '- Locate before reading: Grep/Glob first, then Read only the files and line ranges you need; never read a large log whole.',
  '- Batch independent tool calls in one turn. Do not re-read a file you already have unless it changed.',
  '- Escalate to the tokenfisher:opus-architect agent for cross-module design, concurrency or security-sensitive logic, tricky spec edge cases, or a bug that survived two fix attempts. Use the tokenfisher:scout agent to digest large files or logs.',
  '- When output says "[tokenfisher: N lines omitted …]", Read the saved file only if the omitted part matters.',
  '- Run the tests after changing code; finish with a short summary of what changed and how it was verified.',
].join('\n');

process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: POLICY } }));
