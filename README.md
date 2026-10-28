<p align="center">
  <img src="assets/banner.svg" alt="tokenfisher: catch only the tokens you need" width="100%">
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-3DD3F5"></a>
  <img alt="Claude Code plugin" src="https://img.shields.io/badge/Claude%20Code-plugin-F0761C">
  <img alt="Node 18+" src="https://img.shields.io/badge/node-%E2%89%A518-1667D6">
  <img alt="zero dependencies" src="https://img.shields.io/badge/dependencies-0-FFC93C">
  <a href="README.vi.md"><img alt="Tiếng Việt" src="https://img.shields.io/badge/docs-Ti%E1%BA%BFng%20Vi%E1%BB%87t-10345A"></a>
</p>

**tokenfisher** cuts what Claude Code spends on tokens without making it worse at the job. It does that by **measuring first**, cutting only what doesn't hurt, and proving it with A/B runs instead of claims.

Like a kingfisher, it waits, watches, and dives for the one fish worth catching.

## Results: same prompts, hidden tests, real cost

60 headless Claude Code runs: 5 tasks from easy to complex × 4 configurations × 3 repetitions, graded by hidden tests the agent never sees.

| configuration | quality (hidden checks passed) | cost vs baseline (95% CI) |
|---|---|---|
| **A** baseline: Claude Code defaults, Opus | 100% (15/15 runs) | – |
| **B** tokenfisher, same model (Opus) | 100% (15/15) | **−14.5%** (−0.4% … −27.2%) |
| **C** tokenfisher + Sonnet routing | 100% (15/15) | **−61.6%** (−57.0% … −65.7%) |
| **D** tokenfisher + `--effort medium` | 100% (15/15) | −10.7% (+1.1% … −24.2%), not significant |

By difficulty:

| level | task | B vs A | C vs A |
|---|---|---|---|
| easy | fix an off-by-one; implement `slugify` with Vietnamese diacritics | −30.0% | −65.7% |
| medium | 243-line failing suite, two bugs across two files, tests frozen | −27.3% | −67.4% |
| hard | find a 500-error root cause in a ~5,000-line log, fix, add regression test | −20.4% | −63.5% |
| complex | stock reservations with expiry: 10 requirements across store + API | **+13.5%** | −52.5% |

What the numbers say, without spin:

- **No quality loss in any of the 60 runs.** That is 15 runs per arm on small repos: evidence of no regression here, not proof for every codebase.
- **Model routing is the big lever.** Sonnet with tokenfisher cost 62% less and passed every check, from easy to complex.
- **On the same model, tokenfisher saved 20–30% on easy to hard tasks.** On the complex task it cost 13.5% more: two of its three runs wrote ~2× more output. With 3 reps that is within noise, but it is reported as measured.
- **The output-compression hook never fired in these runs.** The agents piped and limited test output themselves, so B's savings came from a smaller prompt prefix (no MCP servers/connectors) and the lean-reading prompt. The hook earns its keep on noisy logs and test/build output: a 500-test failure log went from 14.2k to 1.9k characters, and the model still quoted the failing assertion exactly.

Every run is published with its transcript, grade and diff in [`evidence/ab-2026-10-28-opus/`](evidence/ab-2026-10-28-opus/REPORT.md). Total spend for the 60 runs: $10.49 at list price. The runs were executed before the project was renamed, under the working name `token-diet`.

## What's inside

| tool | what it does |
|---|---|
| **`token-report`** | Reads your Claude Code transcripts and shows where tokens went: input vs cache write vs cache read vs output, by model, by project, main vs subagents. It also shows the **rent** each tool result pays by staying in context, cache rebuilds, and long sessions, with concrete suggestions. `--simulate` replays the compression filter over your past shell output to estimate its savings for *your* workload. |
| **`token-audit`** | Breaks down what every session loads before your first prompt (system prompt, skill and agent listings, MCP tool names and instructions, hook output, CLAUDE.md/memory). It traces each entry to the file or plugin it came from and ranks what you can remove. |
| **squash hook** | A `PostToolUse` hook for `Bash` and `PowerShell`. The command runs untouched (permissions, cwd and exit code unchanged); only what Claude *reads* is compressed, and the full output is saved to disk so Claude can read it back. |
| **A/B eval** | The harness behind the numbers above: fixed prompts, fresh repos, hidden graders, a grader self-test, paired bootstrap CIs and per-run evidence. Bring your own tasks. |

## Install

In Claude Code:

```
/plugin marketplace add Caoquyen1913/tokenfisher
/plugin install tokenfisher@tokenfisher
```

Or try it for one session from a clone:

```bash
git clone https://github.com/Caoquyen1913/tokenfisher.git
```

```bash
claude --plugin-dir ./tokenfisher
```

Requires Node 18+, no npm dependencies. Developed and tested on Windows 11 (Git Bash and PowerShell). It is plain Node, so macOS and Linux should work, but they are not verified yet.

## Use

Ask Claude "where did my tokens go?" or run `/tokenfisher:tokenfisher`. Or run the scripts directly from a clone:

```bash
node bin/token-report.js --days 7 --simulate
```

```bash
node bin/token-audit.js
```

Example audit output (desktop app session, 74.9k startup tokens):

```
component                                       tokens  share  you control
Tool schemas (remainder, not in transcript)      56.5k  75.5%
System prompt                                     7.6k  10.1%
Skill listing                                     6.2k   8.3%
  claude.ai skills (synced to your account) (13)  1.9k   2.5%  yes
  ~/.claude/commands/gsd/ (57)                    1.2k   1.7%  yes
Agent listing                                     2.4k   3.2%
  ~/.claude/agents/gsd-* (18)                     1.0k   1.3%  yes
...
You control ≈ 7.1k of 74.9k startup tokens (10%); the rest is Claude Code itself.
```

## How the hook stays safe

Each command is classified (`lib/squash.js`):

| class | commands | treatment |
|---|---|---|
| `pass` | any pipeline segment that *views content* (`cat`, `sed -n`, `head`, `tail`, `jq`, `Get-Content`…), `git diff/show/blame`, JSON output, or a trailing `# no-squash` | untouched, byte for byte |
| `full` | noisy families: npm/pnpm/yarn/npx, pip/uv/poetry, pytest/jest/vitest, `node …test…`, cargo/go/dotnet/mvn/gradle, make, tsc/eslint/ruff/mypy, docker build/logs, terraform, `git log/status/pull/clone…` | clean + truncate |
| `clean` | everything else | clean only: **never drops a content line** |

- **Clean** strips ANSI codes, keeps only the last redraw of `\r` progress lines, drops progress bars, and collapses repeated lines into `(previous line repeated N more times)`.
- **Truncate** applies only to `full` output over 60 lines or 6,000 characters. It keeps the first 15 lines, the last 40, and every error/warning-looking line with ±2 lines of context. It then appends `[tokenfisher: N lines omitted; full output saved at …]`.
- Output under 1,500 characters is never touched. Any hook error lets the original output through.
- Raw output goes to `~/.claude/tokenfisher/raw/` (newest 300 kept). Inline credentials such as `PASSWORD=…` are masked before anything is written.
- Turn it off with `TOKENFISHER_DISABLE=1`.

## Findings worth knowing

These were measured while building the eval:

- **A warm cache skews comparisons.** On the first try, the baseline looked 3× cheaper only because its prompt prefix matched everyday sessions already in cache. The runner now warms every arm first and shuffles arm order.
- **`--strict-mcp-config` shrank the startup prefix from 40.8k to 35.2k tokens** in a headless session with claude.ai connectors.
- **`--disable-slash-commands` *grew* it to 47.1k (+6.3k).** Don't use it to save tokens.
- **Startup context is mostly fixed.** In a desktop-app session about 75% of the 75k startup tokens were tool schemas; the part you control was ~10%.
- **On one real 30-day history, cache reads were 61% of weighted cost**, cache writes 30% and output 9%. Long sessions and idle gaps (cache rebuilds were 18.6%) matter more than verbose answers.

## Reproduce or extend the eval

```bash
node eval/selftest.js
```

```bash
node eval/ab.js --arms A,B,C,D --tasks all --reps 3 --parallel 2 --budget 3
```

```bash
node eval/report.js eval/results/<run>
```

```bash
node eval/publish.js eval/results/<run>
```

- `selftest` proves each grader discriminates: the untouched repo must fail and the reference solution must score 100%.
- `ab.js` warms each arm, then runs every (task, arm, rep) in a fresh git-initialised temp repo and grades it.
- `publish.js` copies a run into `evidence/` with home paths, account name, emails, connector lists and rate-limit records removed.

To add a task, create `eval/tasks/<n>-<level>-<name>/` with `task.json` (`level`, `prompt`, optional `testsFrozen`), `repo/`, `hidden/checks.js`, a reference `solution/`, and optionally `prepare.js`.

## Contributing

Issues and PRs are welcome, especially:

- new eval tasks, mainly bigger and messier ones;
- reports from macOS/Linux;
- smarter filters for noisy command families.

Run `npm test` and `node eval/selftest.js` before opening a PR.

## License

[MIT](LICENSE) © 2026 Kawin Tran
