'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const AUDIT = path.join(__dirname, '..', 'bin', 'token-audit.js');

function fakeClaudeDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'token-audit-'));
  fs.mkdirSync(path.join(dir, 'commands', 'gsd'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'skills', 'my-skill'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'agents', 'gsd-planner.md'), '---\nname: gsd-planner\n---\n');
  fs.mkdirSync(path.join(dir, 'projects', 'p1'), { recursive: true });
  const att = (attachment) => JSON.stringify({ type: 'attachment', cwd: dir, attachment });
  const lines = [
    att({ type: 'prompt_snapshot', systemPrompt: ['x'.repeat(4000), '# Memory\n' + 'm'.repeat(400)] }),
    att({
      type: 'skill_listing',
      names: ['gsd:plan', 'my-skill', 'dataviz'],
      content: `- gsd:plan: ${'p'.repeat(100)}\n- my-skill: ${'s'.repeat(500)}\n- dataviz: ${'d'.repeat(200)}\n`,
    }),
    att({ type: 'agent_listing_delta', addedTypes: ['gsd-planner', 'Explore'], addedLines: ['- gsd-planner: ' + 'a'.repeat(400), '- Explore: x'], builtInTypes: ['Explore'] }),
    att({ type: 'deferred_tools_delta', addedLines: ['mcp__notion__search', 'mcp__ccd_pr__get_status', 'WebFetch'] }),
    att({ type: 'mcp_instructions_delta', addedNames: ['notion'], addedBlocks: ['n'.repeat(800)] }),
    att({ type: 'hook_additional_context', hookEvent: 'SessionStart', content: ['## Project Brain\n' + 'b'.repeat(1200)] }),
    att({ type: 'instructions', files: [{ path: path.join(dir, 'CLAUDE.md'), type: 'Project', content: 'line\n'.repeat(250) }] }),
    JSON.stringify({ type: 'assistant', timestamp: '2026-10-28T00:00:00Z', message: { id: 'm1', model: 'claude-opus-5-5', usage: { input_tokens: 10, cache_creation_input_tokens: 10000, cache_read_input_tokens: 0, output_tokens: 5 } } }),
    att({ type: 'hook_additional_context', hookEvent: 'PostToolUse', content: ['c'.repeat(400)] }),
    JSON.stringify({ type: 'assistant', message: { id: 'm2', model: 'claude-opus-5-5', usage: { input_tokens: 1, cache_read_input_tokens: 10010, output_tokens: 5 } } }),
  ];
  fs.writeFileSync(path.join(dir, 'projects', 'p1', 's1.jsonl'), lines.join('\n'));
  return dir;
}

test('audit traces each startup item to its source and computes the tool-schema remainder', () => {
  const dir = fakeClaudeDir();
  const r = JSON.parse(execFileSync(process.execPath, [AUDIT, '--json', '--claude-dir', dir], { encoding: 'utf8' }));
  const by = (g) => r.items.find((i) => i.group === g);
  assert.equal(r.startupTokens, 10010);
  assert.equal(r.requestsMedian, 2);
  assert.equal(by('~/.claude/commands/gsd/').kind, 'user-commands');
  assert.equal(by('~/.claude/skills/').kind, 'user-skills');
  assert.equal(by('built-in skills').kind, 'builtin');
  assert.equal(by('~/.claude/agents/gsd-*').kind, 'user-agents');
  assert.equal(by('built-in agents').kind, 'builtin');
  assert.equal(r.items.filter((i) => i.group === 'MCP notion').length, 2); // tool names + instructions
  assert.equal(by('MCP ccd_pr (desktop app)').kind, 'builtin');
  assert.equal(by('auto-memory instructions').kind, 'memory');
  assert.equal(by('~/.claude/CLAUDE.md').lines, 251);
  assert.ok(r.items.some((i) => i.kind === 'hook' && i.group.startsWith('## Project Brain')));
  const known = r.items.filter((i) => i.section !== 'Tool schemas (remainder, not in transcript)').reduce((n, i) => n + i.chars / 4, 0);
  const remainder = r.items.find((i) => i.group === 'built-in + app tool schemas');
  assert.ok(Math.abs(remainder.tokens - (10010 - known)) <= 1);
  assert.equal(r.laterHooks.PostToolUse.count, 1);
});

test('text report recommends the controllable items, biggest first', () => {
  const dir = fakeClaudeDir();
  const out = execFileSync(process.execPath, [AUDIT, '--claude-dir', dir], { encoding: 'utf8' });
  const recs = out.split('\n').filter((l) => /^\s*\d+\. /.test(l));
  assert.match(recs[0], /CLAUDE\.md/);
  assert.equal(recs.filter((l) => /MCP notion/.test(l)).length, 1);
  assert.ok(!recs.some((l) => /built-in|desktop app/.test(l)));
  assert.match(out, /251 lines: keep CLAUDE\.md under 200/);
});
