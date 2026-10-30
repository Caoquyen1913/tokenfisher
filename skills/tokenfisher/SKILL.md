---
name: tokenfisher
description: Report where Claude Code tokens go (by category, model, tool result, cache rebuilds, startup context) and how to cut them. Use when the user asks about token usage, cost, context size, or why usage is high.
---

# tokenfisher

## Run the report

The scripts live two levels above this file, in `bin/`:

```
node <this skill's base directory>/../../bin/token-report.js --days 7
```

Options: `--days N`, `--project <substr>`, `--session <id>`, `--top N`, `--simulate` (replays the squash filter over past shell output to estimate its savings), `--json`.

- **A month's total** ("how much did I use in October", "which account"): `--month 2026-10`. Totals the calendar month and splits it by account (claude.ai login, API key or `CLAUDE_CODE_OAUTH_TOKEN`, shown as a short hash), source (desktop, CLI, SDK, IDE), model, tokenfisher level and project. Sessions started before tokenfisher 0.4.0 have no account record and show as unknown.
- **Before vs after a change** (a new level, a new habit): `--compare 2026-10-30 --days 7`. Puts the 7 days before that date next to the 7 days from it. Point at the per-request and per-session lines; totals follow how much the user worked.

Present the result in a few lines: the biggest category, the biggest lever, and the 2–3 suggestions the report prints. Don't paste the whole table unless asked.

## Audit startup context

```
node <this skill's base directory>/../../bin/token-audit.js
```

Breaks down what every session loads before the first prompt (system prompt, skill and agent listings, MCP tool names and instructions, SessionStart hook output, CLAUDE.md/memory), traces each entry to the file or plugin it came from, and ranks what the user can remove. Options: `--sessions N`, `--project <substr>`, `--session <id>`, `--json`. Tool schemas are not in the transcript, so they show as the remainder. Propose the top 3 changes; don't move or delete the user's files without asking.

## Reading the numbers

- **Weighted** = input-token equivalents: output ×5, cache write ×1.25 (×2 for 1h), cache read ×0.1. It tracks dollars.
- **Cache read** dominating means long context re-read on every request: the fix is shorter sessions (`/clear` between unrelated tasks) and smaller startup context, not shorter answers.
- **Rent** of a tool result = what it costs to keep it in context until the session ends. A big result early in a long session is the expensive kind.
- **Startup context** above ~30k: check `/context`; trim CLAUDE.md, disable unused MCP servers, plugins and skill packs.

## When shell output was compressed

The tokenfisher hook rewrites long output of noisy commands (tests, builds, installs, git log…) and ends it with `[tokenfisher: N lines omitted; full output saved at <path>]`.

- The kept lines include every error/warning line with context, the head and the tail. Usually that is enough.
- If the omitted part matters, `Read` the saved file with `offset`/`limit` rather than re-running the command.
- To get one command unfiltered, add `# no-squash` at the end of it. File views (`cat`, `sed -n`, `head`, `Get-Content`…), `git diff`/`git show` and JSON output are never touched.

## When a session warning appears

A `tokenfisher: session is at …k tokens` or `… min since the last request, past the … prompt-cache TTL` line comes from the `UserPromptSubmit` hook; the user sees it too. Don't repeat it. If the new prompt starts an unrelated task, suggest `/clear` in one line; otherwise carry on. You can't run `/compact` or `/clear` yourself. Threshold: `TOKENFISHER_WARN_TOKENS` (default 80000, `0` = off).
