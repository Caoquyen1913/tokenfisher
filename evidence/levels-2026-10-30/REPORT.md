# tokenfisher A/B report

Run started 2026-10-30T03:36:52.623Z · model `opus` · 9 tasks × 5 arms × 3 reps = 135 runs.
Quality = share of grader checks passed (hidden tests + visible suite passes + original tests intact). Cost = `total_cost_usd` reported by `claude -p`.

## Arms

- **A — baseline**: Claude Code defaults (opus): all built-in tools, built-in skills and agents, your MCP servers and claude.ai connectors
- **LOW — level low**: tokenfisher plugin at /tokenfisher:set low: Keeps your model and every tool; warnings, reports and output compression only.
- **HIGH — level high**: tokenfisher plugin at /tokenfisher:set high: Sonnet main thread with every tool; compact at 200k; subagents on Sonnet.
- **ULTRA — level ultra**: tokenfisher plugin at /tokenfisher:set ultra: high + low effort, compact at 150k, stronger output compression.
- **PROMAX — level promax**: tokenfisher plugin at /tokenfisher:set promax: ultra + only the 7 core coding tools (no MCP or web tools), compact at 100k.

Common flags: `-p --output-format stream-json --verbose --no-session-persistence --setting-sources project,local --permission-mode acceptEdits --allowedTools Bash PowerShell Read Edit Write Glob Grep Agent Task --max-budget-usd 5`

## Verdict vs baseline

| arm | cost change (95% CI) | quality Δ (95% CI) | quality non-inferior (margin −0.05) | cost cut significant |
|---|---|---|---|---|
| LOW level low | **+1.6%** (−6.5% … +8.4%) | +0.000 (0.000 … 0.000) | yes | no |
| HIGH level high | **−53.4%** (−58.3% … −48.1%) | +0.000 (0.000 … 0.000) | yes | yes |
| ULTRA level ultra | **−56.4%** (−60.7% … −51.8%) | +0.000 (0.000 … 0.000) | yes | yes |
| PROMAX level promax | **−72.6%** (−75.3% … −69.7%) | +0.000 (0.000 … 0.000) | yes | yes |

Cost change is 1 − Σcost(arm)/Σcost(baseline) over runs paired by task and rep; CIs are paired bootstrap (4,000 resamples). "Non-inferior" means the lower CI bound of the quality change and every level's mean change are above −margin.

## By arm

| arm | runs | quality | all checks pass | mean cost | total cost | mean tokens | mean output | turns | errors |
|---|---|---|---|---|---|---|---|---|---|
| A baseline | 27 | 100.0% | 100.0% | $0.252 | $6.817 | 184.3k | 4.4k | 5.6 | 0 |
| LOW level low | 27 | 100.0% | 100.0% | $0.256 | $6.925 | 191.6k | 4.5k | 5.8 | 0 |
| HIGH level high | 27 | 100.0% | 100.0% | $0.118 | $3.175 | 188.1k | 3.6k | 8.4 | 0 |
| ULTRA level ultra | 27 | 100.0% | 100.0% | $0.110 | $2.973 | 186.9k | 3.1k | 7.8 | 0 |
| PROMAX level promax | 27 | 100.0% | 100.0% | $0.069 | $1.869 | 61.9k | 2.7k | 6.1 | 0 |

## By difficulty (easy → complex)

| level | A quality | LOW quality | HIGH quality | ULTRA quality | PROMAX quality | A cost | LOW cost | HIGH cost | ULTRA cost | PROMAX cost | LOW cost vs A | HIGH cost vs A | ULTRA cost vs A | PROMAX cost vs A |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| easy | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.144 | $0.150 | $0.078 | $0.074 | $0.042 | +4.1% | −45.5% | −48.4% | −70.9% |
| medium | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.139 | $0.145 | $0.073 | $0.081 | $0.041 | +4.9% | −47.2% | −41.6% | −70.2% |
| hard | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.302 | $0.289 | $0.145 | $0.131 | $0.083 | −4.3% | −52.1% | −56.7% | −72.4% |
| complex | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.319 | $0.354 | $0.125 | $0.119 | $0.082 | +10.8% | −60.9% | −62.6% | −74.3% |

## By task

| task | level | A quality | LOW quality | HIGH quality | ULTRA quality | PROMAX quality | A cost | LOW cost | HIGH cost | ULTRA cost | PROMAX cost | A tokens | LOW tokens | HIGH tokens | ULTRA tokens | PROMAX tokens |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1-easy-range | easy | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.107 | $0.115 | $0.057 | $0.057 | $0.028 | 104.4k | 107.9k | 108.0k | 108.0k | 34.0k |
| 2-easy-slugify | easy | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.180 | $0.184 | $0.100 | $0.091 | $0.056 | 158.5k | 149.5k | 190.5k | 162.7k | 64.5k |
| 3-medium-cart | medium | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.139 | $0.145 | $0.073 | $0.081 | $0.041 | 144.5k | 148.9k | 161.3k | 213.2k | 60.1k |
| 4-hard-logs | hard | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.220 | $0.217 | $0.131 | $0.106 | $0.075 | 207.1k | 195.3k | 297.1k | 246.0k | 92.9k |
| 5-complex-inventory | complex | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.294 | $0.292 | $0.141 | $0.135 | $0.095 | 160.5k | 176.3k | 174.9k | 160.0k | 57.9k |
| 6-hard-semver | hard | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.466 | $0.487 | $0.250 | $0.224 | $0.138 | 255.1k | 283.6k | 292.3k | 286.3k | 69.4k |
| 7-hard-queue | hard | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.196 | $0.199 | $0.094 | $0.089 | $0.056 | 151.4k | 141.9k | 153.0k | 151.5k | 53.2k |
| 8-complex-perf | complex | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.345 | $0.416 | $0.109 | $0.103 | $0.070 | 260.7k | 289.4k | 154.7k | 167.0k | 55.3k |
| 9-hard-billing | hard | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.326 | $0.254 | $0.104 | $0.104 | $0.065 | 216.1k | 231.6k | 161.5k | 187.0k | 70.1k |

## Every run (evidence)

Each folder under `runs/` holds `transcript.jsonl` (every message, tool call and tool result of the run), `result.json` (usage, cost and final answer), `grade.json` (every check), `changes.diff` (what the agent changed) and, for tokenfisher arms, `tokenfisher/` (compressed-output stats and the raw outputs it saved).

| run | score | cost | tokens | turns | failed checks |
|---|---|---|---|---|---|
| [1-easy-range__A__r1](runs/1-easy-range__A__r1/) | 8/8 | $0.108 | 104.5k | 4 | – |
| [1-easy-range__A__r2](runs/1-easy-range__A__r2/) | 8/8 | $0.108 | 104.4k | 4 | – |
| [1-easy-range__A__r3](runs/1-easy-range__A__r3/) | 8/8 | $0.106 | 104.4k | 4 | – |
| [1-easy-range__HIGH__r1](runs/1-easy-range__HIGH__r1/) | 8/8 | $0.057 | 109.3k | 4 | – |
| [1-easy-range__HIGH__r2](runs/1-easy-range__HIGH__r2/) | 8/8 | $0.057 | 107.4k | 4 | – |
| [1-easy-range__HIGH__r3](runs/1-easy-range__HIGH__r3/) | 8/8 | $0.057 | 107.4k | 4 | – |
| [1-easy-range__LOW__r1](runs/1-easy-range__LOW__r1/) | 8/8 | $0.115 | 109.1k | 4 | – |
| [1-easy-range__LOW__r2](runs/1-easy-range__LOW__r2/) | 8/8 | $0.116 | 107.3k | 4 | – |
| [1-easy-range__LOW__r3](runs/1-easy-range__LOW__r3/) | 8/8 | $0.115 | 107.3k | 4 | – |
| [1-easy-range__PROMAX__r1](runs/1-easy-range__PROMAX__r1/) | 8/8 | $0.028 | 34.0k | 4 | – |
| [1-easy-range__PROMAX__r2](runs/1-easy-range__PROMAX__r2/) | 8/8 | $0.028 | 34.0k | 4 | – |
| [1-easy-range__PROMAX__r3](runs/1-easy-range__PROMAX__r3/) | 8/8 | $0.028 | 34.1k | 4 | – |
| [1-easy-range__ULTRA__r1](runs/1-easy-range__ULTRA__r1/) | 8/8 | $0.057 | 109.2k | 4 | – |
| [1-easy-range__ULTRA__r2](runs/1-easy-range__ULTRA__r2/) | 8/8 | $0.057 | 107.4k | 4 | – |
| [1-easy-range__ULTRA__r3](runs/1-easy-range__ULTRA__r3/) | 8/8 | $0.057 | 107.4k | 4 | – |
| [2-easy-slugify__A__r1](runs/2-easy-slugify__A__r1/) | 12/12 | $0.192 | 184.8k | 6 | – |
| [2-easy-slugify__A__r2](runs/2-easy-slugify__A__r2/) | 12/12 | $0.172 | 145.5k | 4 | – |
| [2-easy-slugify__A__r3](runs/2-easy-slugify__A__r3/) | 12/12 | $0.176 | 145.2k | 5 | – |
| [2-easy-slugify__HIGH__r1](runs/2-easy-slugify__HIGH__r1/) | 12/12 | $0.116 | 232.5k | 11 | – |
| [2-easy-slugify__HIGH__r2](runs/2-easy-slugify__HIGH__r2/) | 12/12 | $0.091 | 150.3k | 8 | – |
| [2-easy-slugify__HIGH__r3](runs/2-easy-slugify__HIGH__r3/) | 12/12 | $0.092 | 188.6k | 8 | – |
| [2-easy-slugify__LOW__r1](runs/2-easy-slugify__LOW__r1/) | 12/12 | $0.184 | 149.5k | 5 | – |
| [2-easy-slugify__LOW__r2](runs/2-easy-slugify__LOW__r2/) | 12/12 | $0.182 | 149.4k | 5 | – |
| [2-easy-slugify__LOW__r3](runs/2-easy-slugify__LOW__r3/) | 12/12 | $0.185 | 149.5k | 5 | – |
| [2-easy-slugify__PROMAX__r1](runs/2-easy-slugify__PROMAX__r1/) | 12/12 | $0.059 | 65.6k | 8 | – |
| [2-easy-slugify__PROMAX__r2](runs/2-easy-slugify__PROMAX__r2/) | 12/12 | $0.050 | 62.5k | 5 | – |
| [2-easy-slugify__PROMAX__r3](runs/2-easy-slugify__PROMAX__r3/) | 12/12 | $0.058 | 65.4k | 8 | – |
| [2-easy-slugify__ULTRA__r1](runs/2-easy-slugify__ULTRA__r1/) | 12/12 | $0.090 | 150.1k | 8 | – |
| [2-easy-slugify__ULTRA__r2](runs/2-easy-slugify__ULTRA__r2/) | 12/12 | $0.093 | 188.4k | 8 | – |
| [2-easy-slugify__ULTRA__r3](runs/2-easy-slugify__ULTRA__r3/) | 12/12 | $0.091 | 149.7k | 8 | – |
| [3-medium-cart__A__r1](runs/3-medium-cart__A__r1/) | 9/9 | $0.138 | 144.5k | 4 | – |
| [3-medium-cart__A__r2](runs/3-medium-cart__A__r2/) | 9/9 | $0.139 | 144.5k | 4 | – |
| [3-medium-cart__A__r3](runs/3-medium-cart__A__r3/) | 9/9 | $0.138 | 144.5k | 4 | – |
| [3-medium-cart__HIGH__r1](runs/3-medium-cart__HIGH__r1/) | 9/9 | $0.071 | 148.4k | 4 | – |
| [3-medium-cart__HIGH__r2](runs/3-medium-cart__HIGH__r2/) | 9/9 | $0.069 | 148.1k | 4 | – |
| [3-medium-cart__HIGH__r3](runs/3-medium-cart__HIGH__r3/) | 9/9 | $0.079 | 187.4k | 7 | – |
| [3-medium-cart__LOW__r1](runs/3-medium-cart__LOW__r1/) | 9/9 | $0.145 | 148.6k | 4 | – |
| [3-medium-cart__LOW__r2](runs/3-medium-cart__LOW__r2/) | 9/9 | $0.145 | 147.6k | 4 | – |
| [3-medium-cart__LOW__r3](runs/3-medium-cart__LOW__r3/) | 9/9 | $0.147 | 150.6k | 4 | – |
| [3-medium-cart__PROMAX__r1](runs/3-medium-cart__PROMAX__r1/) | 9/9 | $0.036 | 49.9k | 4 | – |
| [3-medium-cart__PROMAX__r2](runs/3-medium-cart__PROMAX__r2/) | 9/9 | $0.048 | 79.1k | 7 | – |
| [3-medium-cart__PROMAX__r3](runs/3-medium-cart__PROMAX__r3/) | 9/9 | $0.039 | 51.5k | 4 | – |
| [3-medium-cart__ULTRA__r1](runs/3-medium-cart__ULTRA__r1/) | 9/9 | $0.076 | 186.9k | 6 | – |
| [3-medium-cart__ULTRA__r2](runs/3-medium-cart__ULTRA__r2/) | 9/9 | $0.083 | 226.3k | 7 | – |
| [3-medium-cart__ULTRA__r3](runs/3-medium-cart__ULTRA__r3/) | 9/9 | $0.083 | 226.4k | 7 | – |
| [4-hard-logs__A__r1](runs/4-hard-logs__A__r1/) | 12/12 | $0.231 | 198.3k | 7 | – |
| [4-hard-logs__A__r2](runs/4-hard-logs__A__r2/) | 12/12 | $0.218 | 231.2k | 7 | – |
| [4-hard-logs__A__r3](runs/4-hard-logs__A__r3/) | 12/12 | $0.212 | 191.7k | 6 | – |
| [4-hard-logs__HIGH__r1](runs/4-hard-logs__HIGH__r1/) | 12/12 | $0.148 | 333.5k | 14 | – |
| [4-hard-logs__HIGH__r2](runs/4-hard-logs__HIGH__r2/) | 12/12 | $0.130 | 283.9k | 15 | – |
| [4-hard-logs__HIGH__r3](runs/4-hard-logs__HIGH__r3/) | 12/12 | $0.115 | 274.0k | 13 | – |
| [4-hard-logs__LOW__r1](runs/4-hard-logs__LOW__r1/) | 12/12 | $0.204 | 192.5k | 7 | – |
| [4-hard-logs__LOW__r2](runs/4-hard-logs__LOW__r2/) | 12/12 | $0.224 | 196.5k | 7 | – |
| [4-hard-logs__LOW__r3](runs/4-hard-logs__LOW__r3/) | 12/12 | $0.223 | 196.8k | 7 | – |
| [4-hard-logs__PROMAX__r1](runs/4-hard-logs__PROMAX__r1/) | 12/12 | $0.073 | 101.0k | 13 | – |
| [4-hard-logs__PROMAX__r2](runs/4-hard-logs__PROMAX__r2/) | 12/12 | $0.075 | 103.0k | 13 | – |
| [4-hard-logs__PROMAX__r3](runs/4-hard-logs__PROMAX__r3/) | 12/12 | $0.076 | 74.6k | 13 | – |
| [4-hard-logs__ULTRA__r1](runs/4-hard-logs__ULTRA__r1/) | 12/12 | $0.111 | 271.8k | 13 | – |
| [4-hard-logs__ULTRA__r2](runs/4-hard-logs__ULTRA__r2/) | 12/12 | $0.090 | 188.5k | 5 | – |
| [4-hard-logs__ULTRA__r3](runs/4-hard-logs__ULTRA__r3/) | 12/12 | $0.119 | 277.6k | 14 | – |
| [5-complex-inventory__A__r1](runs/5-complex-inventory__A__r1/) | 18/18 | $0.290 | 161.4k | 4 | – |
| [5-complex-inventory__A__r2](runs/5-complex-inventory__A__r2/) | 18/18 | $0.287 | 121.3k | 3 | – |
| [5-complex-inventory__A__r3](runs/5-complex-inventory__A__r3/) | 18/18 | $0.304 | 198.7k | 5 | – |
| [5-complex-inventory__HIGH__r1](runs/5-complex-inventory__HIGH__r1/) | 18/18 | $0.148 | 202.8k | 9 | – |
| [5-complex-inventory__HIGH__r2](runs/5-complex-inventory__HIGH__r2/) | 18/18 | $0.137 | 160.3k | 8 | – |
| [5-complex-inventory__HIGH__r3](runs/5-complex-inventory__HIGH__r3/) | 18/18 | $0.138 | 161.5k | 9 | – |
| [5-complex-inventory__LOW__r1](runs/5-complex-inventory__LOW__r1/) | 18/18 | $0.308 | 203.1k | 6 | – |
| [5-complex-inventory__LOW__r2](runs/5-complex-inventory__LOW__r2/) | 18/18 | $0.289 | 162.5k | 4 | – |
| [5-complex-inventory__LOW__r3](runs/5-complex-inventory__LOW__r3/) | 18/18 | $0.279 | 163.3k | 4 | – |
| [5-complex-inventory__PROMAX__r1](runs/5-complex-inventory__PROMAX__r1/) | 18/18 | $0.094 | 62.9k | 4 | – |
| [5-complex-inventory__PROMAX__r2](runs/5-complex-inventory__PROMAX__r2/) | 18/18 | $0.101 | 64.2k | 4 | – |
| [5-complex-inventory__PROMAX__r3](runs/5-complex-inventory__PROMAX__r3/) | 18/18 | $0.089 | 46.7k | 3 | – |
| [5-complex-inventory__ULTRA__r1](runs/5-complex-inventory__ULTRA__r1/) | 18/18 | $0.129 | 158.2k | 7 | – |
| [5-complex-inventory__ULTRA__r2](runs/5-complex-inventory__ULTRA__r2/) | 18/18 | $0.142 | 161.1k | 10 | – |
| [5-complex-inventory__ULTRA__r3](runs/5-complex-inventory__ULTRA__r3/) | 18/18 | $0.134 | 160.8k | 8 | – |
| [6-hard-semver__A__r1](runs/6-hard-semver__A__r1/) | 16/16 | $0.435 | 264.7k | 7 | – |
| [6-hard-semver__A__r2](runs/6-hard-semver__A__r2/) | 16/16 | $0.492 | 275.5k | 10 | – |
| [6-hard-semver__A__r3](runs/6-hard-semver__A__r3/) | 16/16 | $0.472 | 225.2k | 8 | – |
| [6-hard-semver__HIGH__r1](runs/6-hard-semver__HIGH__r1/) | 16/16 | $0.279 | 330.3k | 16 | – |
| [6-hard-semver__HIGH__r2](runs/6-hard-semver__HIGH__r2/) | 16/16 | $0.222 | 218.5k | 10 | – |
| [6-hard-semver__HIGH__r3](runs/6-hard-semver__HIGH__r3/) | 16/16 | $0.249 | 328.2k | 13 | – |
| [6-hard-semver__LOW__r1](runs/6-hard-semver__LOW__r1/) | 16/16 | $0.498 | 365.0k | 11 | – |
| [6-hard-semver__LOW__r2](runs/6-hard-semver__LOW__r2/) | 16/16 | $0.475 | 218.2k | 7 | – |
| [6-hard-semver__LOW__r3](runs/6-hard-semver__LOW__r3/) | 16/16 | $0.487 | 267.6k | 9 | – |
| [6-hard-semver__PROMAX__r1](runs/6-hard-semver__PROMAX__r1/) | 16/16 | $0.156 | 70.0k | 6 | – |
| [6-hard-semver__PROMAX__r2](runs/6-hard-semver__PROMAX__r2/) | 16/16 | $0.134 | 53.0k | 4 | – |
| [6-hard-semver__PROMAX__r3](runs/6-hard-semver__PROMAX__r3/) | 16/16 | $0.125 | 85.4k | 7 | – |
| [6-hard-semver__ULTRA__r1](runs/6-hard-semver__ULTRA__r1/) | 16/16 | $0.232 | 325.7k | 11 | – |
| [6-hard-semver__ULTRA__r2](runs/6-hard-semver__ULTRA__r2/) | 16/16 | $0.238 | 315.2k | 13 | – |
| [6-hard-semver__ULTRA__r3](runs/6-hard-semver__ULTRA__r3/) | 16/16 | $0.203 | 218.2k | 12 | – |
| [7-hard-queue__A__r1](runs/7-hard-queue__A__r1/) | 15/15 | $0.194 | 151.3k | 4 | – |
| [7-hard-queue__A__r2](runs/7-hard-queue__A__r2/) | 15/15 | $0.199 | 151.8k | 4 | – |
| [7-hard-queue__A__r3](runs/7-hard-queue__A__r3/) | 15/15 | $0.193 | 151.1k | 4 | – |
| [7-hard-queue__HIGH__r1](runs/7-hard-queue__HIGH__r1/) | 15/15 | $0.096 | 154.5k | 7 | – |
| [7-hard-queue__HIGH__r2](runs/7-hard-queue__HIGH__r2/) | 15/15 | $0.092 | 152.1k | 7 | – |
| [7-hard-queue__HIGH__r3](runs/7-hard-queue__HIGH__r3/) | 15/15 | $0.093 | 152.2k | 7 | – |
| [7-hard-queue__LOW__r1](runs/7-hard-queue__LOW__r1/) | 15/15 | $0.181 | 114.1k | 3 | – |
| [7-hard-queue__LOW__r2](runs/7-hard-queue__LOW__r2/) | 15/15 | $0.207 | 155.9k | 4 | – |
| [7-hard-queue__LOW__r3](runs/7-hard-queue__LOW__r3/) | 15/15 | $0.209 | 155.8k | 4 | – |
| [7-hard-queue__PROMAX__r1](runs/7-hard-queue__PROMAX__r1/) | 15/15 | $0.055 | 53.0k | 6 | – |
| [7-hard-queue__PROMAX__r2](runs/7-hard-queue__PROMAX__r2/) | 15/15 | $0.056 | 53.2k | 6 | – |
| [7-hard-queue__PROMAX__r3](runs/7-hard-queue__PROMAX__r3/) | 15/15 | $0.057 | 53.4k | 6 | – |
| [7-hard-queue__ULTRA__r1](runs/7-hard-queue__ULTRA__r1/) | 15/15 | $0.089 | 151.6k | 6 | – |
| [7-hard-queue__ULTRA__r2](runs/7-hard-queue__ULTRA__r2/) | 15/15 | $0.088 | 151.5k | 6 | – |
| [7-hard-queue__ULTRA__r3](runs/7-hard-queue__ULTRA__r3/) | 15/15 | $0.088 | 151.5k | 6 | – |
| [8-complex-perf__A__r1](runs/8-complex-perf__A__r1/) | 13/13 | $0.370 | 249.6k | 8 | – |
| [8-complex-perf__A__r2](runs/8-complex-perf__A__r2/) | 13/13 | $0.276 | 236.4k | 6 | – |
| [8-complex-perf__A__r3](runs/8-complex-perf__A__r3/) | 13/13 | $0.389 | 296.2k | 7 | – |
| [8-complex-perf__HIGH__r1](runs/8-complex-perf__HIGH__r1/) | 13/13 | $0.102 | 153.5k | 6 | – |
| [8-complex-perf__HIGH__r2](runs/8-complex-perf__HIGH__r2/) | 13/13 | $0.115 | 155.6k | 9 | – |
| [8-complex-perf__HIGH__r3](runs/8-complex-perf__HIGH__r3/) | 13/13 | $0.110 | 155.0k | 7 | – |
| [8-complex-perf__LOW__r1](runs/8-complex-perf__LOW__r1/) | 13/13 | $0.411 | 264.4k | 6 | – |
| [8-complex-perf__LOW__r2](runs/8-complex-perf__LOW__r2/) | 13/13 | $0.391 | 254.6k | 6 | – |
| [8-complex-perf__LOW__r3](runs/8-complex-perf__LOW__r3/) | 13/13 | $0.445 | 349.1k | 8 | – |
| [8-complex-perf__PROMAX__r1](runs/8-complex-perf__PROMAX__r1/) | 13/13 | $0.067 | 54.8k | 6 | – |
| [8-complex-perf__PROMAX__r2](runs/8-complex-perf__PROMAX__r2/) | 13/13 | $0.070 | 55.5k | 6 | – |
| [8-complex-perf__PROMAX__r3](runs/8-complex-perf__PROMAX__r3/) | 13/13 | $0.072 | 55.6k | 7 | – |
| [8-complex-perf__ULTRA__r1](runs/8-complex-perf__ULTRA__r1/) | 13/13 | $0.101 | 153.6k | 7 | – |
| [8-complex-perf__ULTRA__r2](runs/8-complex-perf__ULTRA__r2/) | 13/13 | $0.113 | 194.7k | 8 | – |
| [8-complex-perf__ULTRA__r3](runs/8-complex-perf__ULTRA__r3/) | 13/13 | $0.096 | 152.8k | 7 | – |
| [9-hard-billing__A__r1](runs/9-hard-billing__A__r1/) | 11/11 | $0.235 | 197.3k | 7 | – |
| [9-hard-billing__A__r2](runs/9-hard-billing__A__r2/) | 11/11 | $0.476 | 208.0k | 8 | – |
| [9-hard-billing__A__r3](runs/9-hard-billing__A__r3/) | 11/11 | $0.266 | 243.0k | 8 | – |
| [9-hard-billing__HIGH__r1](runs/9-hard-billing__HIGH__r1/) | 11/11 | $0.104 | 161.2k | 8 | – |
| [9-hard-billing__HIGH__r2](runs/9-hard-billing__HIGH__r2/) | 11/11 | $0.105 | 162.8k | 7 | – |
| [9-hard-billing__HIGH__r3](runs/9-hard-billing__HIGH__r3/) | 11/11 | $0.103 | 160.7k | 7 | – |
| [9-hard-billing__LOW__r1](runs/9-hard-billing__LOW__r1/) | 11/11 | $0.252 | 202.8k | 8 | – |
| [9-hard-billing__LOW__r2](runs/9-hard-billing__LOW__r2/) | 11/11 | $0.258 | 246.7k | 8 | – |
| [9-hard-billing__LOW__r3](runs/9-hard-billing__LOW__r3/) | 11/11 | $0.251 | 245.4k | 8 | – |
| [9-hard-billing__PROMAX__r1](runs/9-hard-billing__PROMAX__r1/) | 11/11 | $0.067 | 75.6k | 5 | – |
| [9-hard-billing__PROMAX__r2](runs/9-hard-billing__PROMAX__r2/) | 11/11 | $0.061 | 60.0k | 4 | – |
| [9-hard-billing__PROMAX__r3](runs/9-hard-billing__PROMAX__r3/) | 11/11 | $0.067 | 74.6k | 5 | – |
| [9-hard-billing__ULTRA__r1](runs/9-hard-billing__ULTRA__r1/) | 11/11 | $0.108 | 199.4k | 8 | – |
| [9-hard-billing__ULTRA__r2](runs/9-hard-billing__ULTRA__r2/) | 11/11 | $0.111 | 204.4k | 9 | – |
| [9-hard-billing__ULTRA__r3](runs/9-hard-billing__ULTRA__r3/) | 11/11 | $0.094 | 157.2k | 5 | – |

## Caveats

- 3 reps per task: CIs are wide; treat small differences as noise.
- Tasks are small synthetic JS repos; real sessions are longer, so per-request savings (startup context, tool output) compound more there.
- All arms skip user-level settings (personal hooks), so savings from removing per-call hooks are not counted.
- Cost is Claude Code's own estimate at list price.
