# token-diet A/B report

Run started 2026-10-28T15:45:28.825Z · model `opus` · 5 tasks × 4 arms × 3 reps = 60 runs.
Quality = share of grader checks passed (hidden tests + visible suite passes + original tests intact). Cost = `total_cost_usd` reported by `claude -p`.

## Arms

- **A — baseline**: Claude Code defaults (opus): built-in skills and agents, your MCP servers and claude.ai connectors loaded
- **B — token-diet**: Same model (opus) + token-diet output hook + no MCP/connectors + lean-reading prompt
- **C — token-diet + sonnet**: B with model routed to Sonnet
- **D — token-diet + effort medium**: B (opus) with --effort medium

Common flags: `-p --output-format stream-json --verbose --no-session-persistence --setting-sources project,local --permission-mode acceptEdits --allowedTools Bash PowerShell Read Edit Write Glob Grep --max-budget-usd 3`

## Verdict vs baseline

| arm | cost change (95% CI) | quality Δ (95% CI) | quality non-inferior (margin −0.05) | cost cut significant |
|---|---|---|---|---|
| B token-diet | **−14.5%** (−27.2% … −0.4%) | +0.000 (0.000 … 0.000) | yes | yes |
| C token-diet + sonnet | **−61.6%** (−65.7% … −57.0%) | +0.000 (0.000 … 0.000) | yes | yes |
| D token-diet + effort medium | **−10.7%** (−24.2% … +1.1%) | +0.000 (0.000 … 0.000) | yes | no |

Cost change is 1 − Σcost(arm)/Σcost(baseline) over runs paired by task and rep; CIs are paired bootstrap (4,000 resamples). "Non-inferior" means the lower CI bound of the quality change and every level's mean change are above −margin.

## By arm

| arm | runs | quality | all checks pass | mean cost | total cost | mean tokens | mean output | turns | errors |
|---|---|---|---|---|---|---|---|---|---|
| A baseline | 15 | 100.0% | 100.0% | $0.223 | $3.348 | 190.6k | 2.7k | 5.6 | 0 |
| B token-diet | 15 | 100.0% | 100.0% | $0.191 | $2.863 | 164.3k | 3.2k | 5.7 | 0 |
| C token-diet + sonnet | 15 | 100.0% | 100.0% | $0.086 | $1.287 | 184.3k | 2.3k | 6.9 | 0 |
| D token-diet + effort medium | 15 | 100.0% | 100.0% | $0.199 | $2.991 | 172.5k | 3.5k | 6.0 | 0 |

## By difficulty (easy → complex)

| level | A quality | B quality | C quality | D quality | A cost | B cost | C cost | D cost | B cost vs A | C cost vs A | D cost vs A |
|---|---|---|---|---|---|---|---|---|---|---|---|
| easy | 100.0% | 100.0% | 100.0% | 100.0% | $0.181 | $0.127 | $0.062 | $0.127 | −30.0% | −65.7% | −30.0% |
| medium | 100.0% | 100.0% | 100.0% | 100.0% | $0.176 | $0.128 | $0.057 | $0.128 | −27.3% | −67.4% | −27.4% |
| hard | 100.0% | 100.0% | 100.0% | 100.0% | $0.245 | $0.195 | $0.089 | $0.215 | −20.4% | −63.5% | −12.3% |
| complex | 100.0% | 100.0% | 100.0% | 100.0% | $0.332 | $0.377 | $0.158 | $0.401 | +13.5% | −52.5% | +20.5% |

## By task

| task | level | A quality | B quality | C quality | D quality | A cost | B cost | C cost | D cost | A tokens | B tokens | C tokens | D tokens |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1-easy-range | easy | 100.0% | 100.0% | 100.0% | 100.0% | $0.139 | $0.091 | $0.046 | $0.091 | 124.9k | 108.4k | 109.6k | 108.4k |
| 2-easy-slugify | easy | 100.0% | 100.0% | 100.0% | 100.0% | $0.224 | $0.163 | $0.079 | $0.163 | 216.9k | 150.2k | 176.9k | 150.2k |
| 3-medium-cart | medium | 100.0% | 100.0% | 100.0% | 100.0% | $0.176 | $0.128 | $0.057 | $0.128 | 171.9k | 150.2k | 150.4k | 150.3k |
| 4-hard-logs | hard | 100.0% | 100.0% | 100.0% | 100.0% | $0.245 | $0.195 | $0.089 | $0.215 | 238.4k | 196.3k | 244.6k | 235.9k |
| 5-complex-inventory | complex | 100.0% | 100.0% | 100.0% | 100.0% | $0.332 | $0.377 | $0.158 | $0.401 | 200.9k | 216.2k | 239.9k | 217.8k |

## Every run (evidence)

Each folder under `runs/` holds `transcript.jsonl` (every message, tool call and tool result of the run), `result.json` (usage, cost and final answer), `grade.json` (every check), `changes.diff` (what the agent changed) and, for token-diet arms, `token-diet/` (compressed-output stats and the raw outputs it saved).

| run | score | cost | tokens | turns | failed checks |
|---|---|---|---|---|---|
| [1-easy-range__A__r1](runs/1-easy-range__A__r1/) | 8/8 | $0.140 | 125.1k | 4 | – |
| [1-easy-range__A__r2](runs/1-easy-range__A__r2/) | 8/8 | $0.136 | 124.4k | 4 | – |
| [1-easy-range__A__r3](runs/1-easy-range__A__r3/) | 8/8 | $0.140 | 125.2k | 4 | – |
| [1-easy-range__B__r1](runs/1-easy-range__B__r1/) | 8/8 | $0.091 | 108.4k | 4 | – |
| [1-easy-range__B__r2](runs/1-easy-range__B__r2/) | 8/8 | $0.091 | 108.4k | 4 | – |
| [1-easy-range__B__r3](runs/1-easy-range__B__r3/) | 8/8 | $0.091 | 108.4k | 4 | – |
| [1-easy-range__C__r1](runs/1-easy-range__C__r1/) | 8/8 | $0.046 | 109.6k | 4 | – |
| [1-easy-range__C__r2](runs/1-easy-range__C__r2/) | 8/8 | $0.045 | 109.6k | 4 | – |
| [1-easy-range__C__r3](runs/1-easy-range__C__r3/) | 8/8 | $0.046 | 109.7k | 4 | – |
| [1-easy-range__D__r1](runs/1-easy-range__D__r1/) | 8/8 | $0.091 | 108.4k | 4 | – |
| [1-easy-range__D__r2](runs/1-easy-range__D__r2/) | 8/8 | $0.091 | 108.4k | 4 | – |
| [1-easy-range__D__r3](runs/1-easy-range__D__r3/) | 8/8 | $0.091 | 108.4k | 4 | – |
| [2-easy-slugify__A__r1](runs/2-easy-slugify__A__r1/) | 12/12 | $0.206 | 172.4k | 5 | – |
| [2-easy-slugify__A__r2](runs/2-easy-slugify__A__r2/) | 12/12 | $0.209 | 171.6k | 6 | – |
| [2-easy-slugify__A__r3](runs/2-easy-slugify__A__r3/) | 12/12 | $0.256 | 306.9k | 7 | – |
| [2-easy-slugify__B__r1](runs/2-easy-slugify__B__r1/) | 12/12 | $0.165 | 150.4k | 6 | – |
| [2-easy-slugify__B__r2](runs/2-easy-slugify__B__r2/) | 12/12 | $0.156 | 149.7k | 5 | – |
| [2-easy-slugify__B__r3](runs/2-easy-slugify__B__r3/) | 12/12 | $0.167 | 150.5k | 6 | – |
| [2-easy-slugify__C__r1](runs/2-easy-slugify__C__r1/) | 12/12 | $0.076 | 151.6k | 8 | – |
| [2-easy-slugify__C__r2](runs/2-easy-slugify__C__r2/) | 12/12 | $0.081 | 189.8k | 8 | – |
| [2-easy-slugify__C__r3](runs/2-easy-slugify__C__r3/) | 12/12 | $0.078 | 189.3k | 8 | – |
| [2-easy-slugify__D__r1](runs/2-easy-slugify__D__r1/) | 12/12 | $0.163 | 150.3k | 5 | – |
| [2-easy-slugify__D__r2](runs/2-easy-slugify__D__r2/) | 12/12 | $0.165 | 150.3k | 5 | – |
| [2-easy-slugify__D__r3](runs/2-easy-slugify__D__r3/) | 12/12 | $0.161 | 150.1k | 4 | – |
| [3-medium-cart__A__r1](runs/3-medium-cart__A__r1/) | 9/9 | $0.181 | 172.6k | 8 | – |
| [3-medium-cart__A__r2](runs/3-medium-cart__A__r2/) | 9/9 | $0.173 | 171.6k | 4 | – |
| [3-medium-cart__A__r3](runs/3-medium-cart__A__r3/) | 9/9 | $0.174 | 171.6k | 4 | – |
| [3-medium-cart__B__r1](runs/3-medium-cart__B__r1/) | 9/9 | $0.129 | 150.3k | 4 | – |
| [3-medium-cart__B__r2](runs/3-medium-cart__B__r2/) | 9/9 | $0.127 | 150.0k | 5 | – |
| [3-medium-cart__B__r3](runs/3-medium-cart__B__r3/) | 9/9 | $0.128 | 150.2k | 4 | – |
| [3-medium-cart__C__r1](runs/3-medium-cart__C__r1/) | 9/9 | $0.057 | 150.3k | 4 | – |
| [3-medium-cart__C__r2](runs/3-medium-cart__C__r2/) | 9/9 | $0.057 | 150.2k | 4 | – |
| [3-medium-cart__C__r3](runs/3-medium-cart__C__r3/) | 9/9 | $0.059 | 150.8k | 4 | – |
| [3-medium-cart__D__r1](runs/3-medium-cart__D__r1/) | 9/9 | $0.126 | 150.3k | 5 | – |
| [3-medium-cart__D__r2](runs/3-medium-cart__D__r2/) | 9/9 | $0.129 | 150.2k | 6 | – |
| [3-medium-cart__D__r3](runs/3-medium-cart__D__r3/) | 9/9 | $0.129 | 150.3k | 5 | – |
| [4-hard-logs__A__r1](runs/4-hard-logs__A__r1/) | 12/12 | $0.255 | 227.2k | 7 | – |
| [4-hard-logs__A__r2](runs/4-hard-logs__A__r2/) | 12/12 | $0.231 | 218.8k | 7 | – |
| [4-hard-logs__A__r3](runs/4-hard-logs__A__r3/) | 12/12 | $0.249 | 269.3k | 7 | – |
| [4-hard-logs__B__r1](runs/4-hard-logs__B__r1/) | 12/12 | $0.199 | 198.4k | 7 | – |
| [4-hard-logs__B__r2](runs/4-hard-logs__B__r2/) | 12/12 | $0.192 | 195.7k | 6 | – |
| [4-hard-logs__B__r3](runs/4-hard-logs__B__r3/) | 12/12 | $0.195 | 194.7k | 7 | – |
| [4-hard-logs__C__r1](runs/4-hard-logs__C__r1/) | 12/12 | $0.093 | 270.3k | 7 | – |
| [4-hard-logs__C__r2](runs/4-hard-logs__C__r2/) | 12/12 | $0.090 | 233.1k | 6 | – |
| [4-hard-logs__C__r3](runs/4-hard-logs__C__r3/) | 12/12 | $0.085 | 230.3k | 6 | – |
| [4-hard-logs__D__r1](runs/4-hard-logs__D__r1/) | 12/12 | $0.224 | 275.7k | 9 | – |
| [4-hard-logs__D__r2](runs/4-hard-logs__D__r2/) | 12/12 | $0.195 | 194.9k | 7 | – |
| [4-hard-logs__D__r3](runs/4-hard-logs__D__r3/) | 12/12 | $0.226 | 237.0k | 8 | – |
| [5-complex-inventory__A__r1](runs/5-complex-inventory__A__r1/) | 18/18 | $0.331 | 187.9k | 4 | – |
| [5-complex-inventory__A__r2](runs/5-complex-inventory__A__r2/) | 18/18 | $0.344 | 231.1k | 5 | – |
| [5-complex-inventory__A__r3](runs/5-complex-inventory__A__r3/) | 18/18 | $0.322 | 183.6k | 8 | – |
| [5-complex-inventory__B__r1](runs/5-complex-inventory__B__r1/) | 18/18 | $0.397 | 219.3k | 8 | – |
| [5-complex-inventory__B__r2](runs/5-complex-inventory__B__r2/) | 18/18 | $0.276 | 202.3k | 5 | – |
| [5-complex-inventory__B__r3](runs/5-complex-inventory__B__r3/) | 18/18 | $0.459 | 226.8k | 10 | – |
| [5-complex-inventory__C__r1](runs/5-complex-inventory__C__r1/) | 18/18 | $0.138 | 206.1k | 12 | – |
| [5-complex-inventory__C__r2](runs/5-complex-inventory__C__r2/) | 18/18 | $0.201 | 308.1k | 14 | – |
| [5-complex-inventory__C__r3](runs/5-complex-inventory__C__r3/) | 18/18 | $0.135 | 205.6k | 11 | – |
| [5-complex-inventory__D__r1](runs/5-complex-inventory__D__r1/) | 18/18 | $0.424 | 259.0k | 9 | – |
| [5-complex-inventory__D__r2](runs/5-complex-inventory__D__r2/) | 18/18 | $0.386 | 175.7k | 7 | – |
| [5-complex-inventory__D__r3](runs/5-complex-inventory__D__r3/) | 18/18 | $0.392 | 218.7k | 8 | – |

## Caveats

- 3 reps per task: CIs are wide; treat small differences as noise.
- Tasks are small synthetic JS repos; real sessions are longer, so per-request savings (startup context, tool output) compound more there.
- All arms skip user-level settings (personal hooks), so savings from removing per-call hooks are not counted.
- Cost is Claude Code's own estimate at list price.
