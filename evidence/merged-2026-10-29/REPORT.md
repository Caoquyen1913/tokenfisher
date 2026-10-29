# tokenfisher A/B report

Run started 2026-10-29T05:12:49.440Z · model `opus` · 9 tasks × 2 arms × 3 reps = 54 runs.
Quality = share of grader checks passed (hidden tests + visible suite passes + original tests intact). Cost = `total_cost_usd` reported by `claude -p`.

## Arms

- **A — baseline**: Claude Code defaults (opus): all built-in tools, built-in skills and agents, your MCP servers and claude.ai connectors
- **P — tokenfisher plugin**: tokenfisher plugin, zero flags: Sonnet main thread with every tool, Opus escalation agent, Haiku scout, policy, output hook

Common flags: `-p --output-format stream-json --verbose --no-session-persistence --setting-sources project,local --permission-mode acceptEdits --allowedTools Bash PowerShell Read Edit Write Glob Grep Agent Task --max-budget-usd 5`

## Verdict vs baseline

| arm | cost change (95% CI) | quality Δ (95% CI) | quality non-inferior (margin −0.05) | cost cut significant |
|---|---|---|---|---|
| P tokenfisher plugin | **−56.1%** (−60.1% … −51.8%) | +0.000 (0.000 … 0.000) | yes | yes |

Cost change is 1 − Σcost(arm)/Σcost(baseline) over runs paired by task and rep; CIs are paired bootstrap (4,000 resamples). "Non-inferior" means the lower CI bound of the quality change and every level's mean change are above −margin.

## By arm

| arm | runs | quality | all checks pass | mean cost | total cost | mean tokens | mean output | turns | errors |
|---|---|---|---|---|---|---|---|---|---|
| A baseline | 27 | 100.0% | 100.0% | $0.253 | $6.821 | 191.0k | 4.6k | 6.0 | 0 |
| P tokenfisher plugin | 27 | 100.0% | 100.0% | $0.111 | $2.993 | 184.3k | 3.3k | 7.7 | 0 |

## By difficulty (easy → complex)

| level | A quality | P quality | A cost | P cost | P cost vs A |
|---|---|---|---|---|---|
| easy | 100.0% | 100.0% | $0.141 | $0.075 | −46.9% |
| medium | 100.0% | 100.0% | $0.146 | $0.081 | −44.4% |
| hard | 100.0% | 100.0% | $0.286 | $0.128 | −55.2% |
| complex | 100.0% | 100.0% | $0.351 | $0.127 | −63.8% |

## By task

| task | level | A quality | P quality | A cost | P cost | A tokens | P tokens |
|---|---|---|---|---|---|---|---|
| 1-easy-range | easy | 100.0% | 100.0% | $0.107 | $0.056 | 104.3k | 106.2k |
| 2-easy-slugify | easy | 100.0% | 100.0% | $0.174 | $0.094 | 133.7k | 162.4k |
| 3-medium-cart | medium | 100.0% | 100.0% | $0.146 | $0.081 | 145.0k | 223.7k |
| 4-hard-logs | hard | 100.0% | 100.0% | $0.212 | $0.107 | 191.3k | 242.8k |
| 5-complex-inventory | complex | 100.0% | 100.0% | $0.307 | $0.147 | 186.7k | 187.4k |
| 6-hard-semver | hard | 100.0% | 100.0% | $0.464 | $0.208 | 252.5k | 232.8k |
| 7-hard-queue | hard | 100.0% | 100.0% | $0.206 | $0.092 | 152.3k | 163.6k |
| 8-complex-perf | complex | 100.0% | 100.0% | $0.395 | $0.108 | 311.4k | 153.0k |
| 9-hard-billing | hard | 100.0% | 100.0% | $0.262 | $0.106 | 242.2k | 187.0k |

## Every run (evidence)

Each folder under `runs/` holds `transcript.jsonl` (every message, tool call and tool result of the run), `result.json` (usage, cost and final answer), `grade.json` (every check), `changes.diff` (what the agent changed) and, for tokenfisher arms, `tokenfisher/` (compressed-output stats and the raw outputs it saved).

| run | score | cost | tokens | turns | failed checks |
|---|---|---|---|---|---|
| [1-easy-range__A__r1](runs/1-easy-range__A__r1/) | 8/8 | $0.107 | 104.2k | 4 | – |
| [1-easy-range__A__r2](runs/1-easy-range__A__r2/) | 8/8 | $0.108 | 104.3k | 4 | – |
| [1-easy-range__A__r3](runs/1-easy-range__A__r3/) | 8/8 | $0.108 | 104.3k | 4 | – |
| [1-easy-range__P__r1](runs/1-easy-range__P__r1/) | 8/8 | $0.056 | 106.2k | 4 | – |
| [1-easy-range__P__r2](runs/1-easy-range__P__r2/) | 8/8 | $0.055 | 106.2k | 4 | – |
| [1-easy-range__P__r3](runs/1-easy-range__P__r3/) | 8/8 | $0.056 | 106.2k | 4 | – |
| [2-easy-slugify__A__r1](runs/2-easy-slugify__A__r1/) | 12/12 | $0.175 | 145.7k | 5 | – |
| [2-easy-slugify__A__r2](runs/2-easy-slugify__A__r2/) | 12/12 | $0.168 | 109.8k | 4 | – |
| [2-easy-slugify__A__r3](runs/2-easy-slugify__A__r3/) | 12/12 | $0.179 | 145.6k | 5 | – |
| [2-easy-slugify__P__r1](runs/2-easy-slugify__P__r1/) | 12/12 | $0.099 | 189.5k | 9 | – |
| [2-easy-slugify__P__r2](runs/2-easy-slugify__P__r2/) | 12/12 | $0.092 | 148.9k | 8 | – |
| [2-easy-slugify__P__r3](runs/2-easy-slugify__P__r3/) | 12/12 | $0.091 | 148.9k | 8 | – |
| [3-medium-cart__A__r1](runs/3-medium-cart__A__r1/) | 9/9 | $0.145 | 144.7k | 6 | – |
| [3-medium-cart__A__r2](runs/3-medium-cart__A__r2/) | 9/9 | $0.145 | 144.8k | 6 | – |
| [3-medium-cart__A__r3](runs/3-medium-cart__A__r3/) | 9/9 | $0.147 | 145.4k | 6 | – |
| [3-medium-cart__P__r1](runs/3-medium-cart__P__r1/) | 9/9 | $0.082 | 223.9k | 7 | – |
| [3-medium-cart__P__r2](runs/3-medium-cart__P__r2/) | 9/9 | $0.082 | 224.0k | 7 | – |
| [3-medium-cart__P__r3](runs/3-medium-cart__P__r3/) | 9/9 | $0.079 | 223.1k | 6 | – |
| [4-hard-logs__A__r1](runs/4-hard-logs__A__r1/) | 12/12 | $0.228 | 194.7k | 7 | – |
| [4-hard-logs__A__r2](runs/4-hard-logs__A__r2/) | 12/12 | $0.190 | 186.4k | 5 | – |
| [4-hard-logs__A__r3](runs/4-hard-logs__A__r3/) | 12/12 | $0.219 | 193.0k | 7 | – |
| [4-hard-logs__P__r1](runs/4-hard-logs__P__r1/) | 12/12 | $0.108 | 229.9k | 13 | – |
| [4-hard-logs__P__r2](runs/4-hard-logs__P__r2/) | 12/12 | $0.102 | 230.7k | 7 | – |
| [4-hard-logs__P__r3](runs/4-hard-logs__P__r3/) | 12/12 | $0.112 | 267.7k | 7 | – |
| [5-complex-inventory__A__r1](runs/5-complex-inventory__A__r1/) | 18/18 | $0.328 | 200.3k | 5 | – |
| [5-complex-inventory__A__r2](runs/5-complex-inventory__A__r2/) | 18/18 | $0.294 | 161.5k | 4 | – |
| [5-complex-inventory__A__r3](runs/5-complex-inventory__A__r3/) | 18/18 | $0.301 | 198.2k | 5 | – |
| [5-complex-inventory__P__r1](runs/5-complex-inventory__P__r1/) | 18/18 | $0.139 | 159.0k | 8 | – |
| [5-complex-inventory__P__r2](runs/5-complex-inventory__P__r2/) | 18/18 | $0.147 | 200.8k | 9 | – |
| [5-complex-inventory__P__r3](runs/5-complex-inventory__P__r3/) | 18/18 | $0.155 | 202.4k | 11 | – |
| [6-hard-semver__A__r1](runs/6-hard-semver__A__r1/) | 16/16 | $0.496 | 270.3k | 11 | – |
| [6-hard-semver__A__r2](runs/6-hard-semver__A__r2/) | 16/16 | $0.474 | 267.7k | 9 | – |
| [6-hard-semver__A__r3](runs/6-hard-semver__A__r3/) | 16/16 | $0.423 | 219.3k | 5 | – |
| [6-hard-semver__P__r1](runs/6-hard-semver__P__r1/) | 16/16 | $0.198 | 214.5k | 7 | – |
| [6-hard-semver__P__r2](runs/6-hard-semver__P__r2/) | 16/16 | $0.207 | 217.3k | 10 | – |
| [6-hard-semver__P__r3](runs/6-hard-semver__P__r3/) | 16/16 | $0.218 | 266.6k | 13 | – |
| [7-hard-queue__A__r1](runs/7-hard-queue__A__r1/) | 15/15 | $0.205 | 152.1k | 4 | – |
| [7-hard-queue__A__r2](runs/7-hard-queue__A__r2/) | 15/15 | $0.216 | 153.3k | 4 | – |
| [7-hard-queue__A__r3](runs/7-hard-queue__A__r3/) | 15/15 | $0.196 | 151.3k | 4 | – |
| [7-hard-queue__P__r1](runs/7-hard-queue__P__r1/) | 15/15 | $0.090 | 150.4k | 7 | – |
| [7-hard-queue__P__r2](runs/7-hard-queue__P__r2/) | 15/15 | $0.088 | 149.9k | 6 | – |
| [7-hard-queue__P__r3](runs/7-hard-queue__P__r3/) | 15/15 | $0.097 | 190.6k | 8 | – |
| [8-complex-perf__A__r1](runs/8-complex-perf__A__r1/) | 13/13 | $0.328 | 204.9k | 5 | – |
| [8-complex-perf__A__r2](runs/8-complex-perf__A__r2/) | 13/13 | $0.379 | 291.3k | 8 | – |
| [8-complex-perf__A__r3](runs/8-complex-perf__A__r3/) | 13/13 | $0.477 | 438.0k | 10 | – |
| [8-complex-perf__P__r1](runs/8-complex-perf__P__r1/) | 13/13 | $0.103 | 152.4k | 7 | – |
| [8-complex-perf__P__r2](runs/8-complex-perf__P__r2/) | 13/13 | $0.111 | 153.4k | 7 | – |
| [8-complex-perf__P__r3](runs/8-complex-perf__P__r3/) | 13/13 | $0.108 | 153.1k | 7 | – |
| [9-hard-billing__A__r1](runs/9-hard-billing__A__r1/) | 11/11 | $0.238 | 197.0k | 8 | – |
| [9-hard-billing__A__r2](runs/9-hard-billing__A__r2/) | 11/11 | $0.277 | 285.8k | 9 | – |
| [9-hard-billing__A__r3](runs/9-hard-billing__A__r3/) | 11/11 | $0.271 | 243.7k | 8 | – |
| [9-hard-billing__P__r1](runs/9-hard-billing__P__r1/) | 11/11 | $0.107 | 199.2k | 9 | – |
| [9-hard-billing__P__r2](runs/9-hard-billing__P__r2/) | 11/11 | $0.103 | 159.2k | 7 | – |
| [9-hard-billing__P__r3](runs/9-hard-billing__P__r3/) | 11/11 | $0.108 | 202.7k | 7 | – |

## Caveats

- 3 reps per task: CIs are wide; treat small differences as noise.
- Tasks are small synthetic JS repos; real sessions are longer, so per-request savings (startup context, tool output) compound more there.
- All arms skip user-level settings (personal hooks), so savings from removing per-call hooks are not counted.
- Cost is Claude Code's own estimate at list price.
