# tokenfisher A/B report

Run started 2026-10-28T16:41:24.419Z · model `opus` · 8 tasks × 5 arms × 3 reps = 120 runs.
Quality = share of grader checks passed (hidden tests + visible suite passes + original tests intact). Cost = `total_cost_usd` reported by `claude -p`.

## Arms

- **A — baseline**: Claude Code defaults (opus): all built-in tools, built-in skills and agents, your MCP servers and claude.ai connectors
- **T — core tools**: opus + B + only the 7 core tools (Bash,PowerShell,Read,Edit,Write,Glob,Grep)
- **S — core tools + sonnet**: T with the model routed to Sonnet
- **L — core tools + sonnet + low effort**: S with --effort low
- **M — max profile**: tokenfisher-max plugin: Sonnet main thread with the 7 core tools, escalation to an Opus subagent, Haiku scout, output hook, no MCP

Common flags: `-p --output-format stream-json --verbose --no-session-persistence --setting-sources project,local --permission-mode acceptEdits --allowedTools Bash PowerShell Read Edit Write Glob Grep Agent Task --max-budget-usd 5`

## Verdict vs baseline

| arm | cost change (95% CI) | quality Δ (95% CI) | quality non-inferior (margin −0.05) | cost cut significant |
|---|---|---|---|---|
| T core tools | **−31.4%** (−41.6% … −22.0%) | +0.000 (0.000 … 0.000) | yes | yes |
| S core tools + sonnet | **−73.7%** (−78.7% … −69.1%) | +0.000 (0.000 … 0.000) | yes | yes |
| L core tools + sonnet + low effort | **−76.5%** (−80.8% … −72.5%) | +0.000 (0.000 … 0.000) | yes | yes |
| M max profile | **−73.6%** (−76.4% … −70.8%) | +0.000 (0.000 … 0.000) | yes | yes |

Cost change is 1 − Σcost(arm)/Σcost(baseline) over runs paired by task and rep; CIs are paired bootstrap (4,000 resamples). "Non-inferior" means the lower CI bound of the quality change and every level's mean change are above −margin.

## By arm

| arm | runs | quality | all checks pass | mean cost | total cost | mean tokens | mean output | turns | errors |
|---|---|---|---|---|---|---|---|---|---|
| A baseline | 24 | 100.0% | 100.0% | $0.282 | $6.760 | 216.0k | 4.5k | 5.9 | 0 |
| T core tools | 24 | 100.0% | 100.0% | $0.193 | $4.639 | 83.4k | 5.0k | 6.0 | 0 |
| S core tools + sonnet | 24 | 100.0% | 100.0% | $0.074 | $1.776 | 65.2k | 3.3k | 6.0 | 0 |
| L core tools + sonnet + low effort | 24 | 100.0% | 100.0% | $0.066 | $1.589 | 63.5k | 2.8k | 5.6 | 0 |
| M max profile | 24 | 100.0% | 100.0% | $0.074 | $1.782 | 81.6k | 3.2k | 8.0 | 0 |

## By difficulty (easy → complex)

| level | A quality | T quality | S quality | L quality | M quality | A cost | T cost | S cost | L cost | M cost | T cost vs A | S cost vs A | L cost vs A | M cost vs A |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| easy | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.176 | $0.078 | $0.034 | $0.032 | $0.040 | −55.5% | −80.8% | −81.9% | −77.3% |
| medium | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.172 | $0.076 | $0.031 | $0.030 | $0.035 | −55.9% | −81.7% | −82.3% | −79.7% |
| hard | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.332 | $0.227 | $0.095 | $0.097 | $0.101 | −31.7% | −71.3% | −70.8% | −69.6% |
| complex | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.368 | $0.317 | $0.104 | $0.072 | $0.088 | −13.7% | −71.8% | −80.3% | −76.0% |

## By task

| task | level | A quality | T quality | S quality | L quality | M quality | A cost | T cost | S cost | L cost | M cost | A tokens | T tokens | S tokens | L tokens | M tokens |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1-easy-range | easy | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.138 | $0.045 | $0.022 | $0.022 | $0.024 | 124.7k | 36.1k | 36.1k | 36.1k | 42.1k |
| 2-easy-slugify | easy | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.213 | $0.112 | $0.046 | $0.042 | $0.056 | 172.9k | 54.9k | 49.1k | 52.5k | 73.0k |
| 3-medium-cart | medium | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.172 | $0.076 | $0.031 | $0.030 | $0.035 | 171.2k | 53.7k | 52.4k | 52.2k | 60.8k |
| 4-hard-logs | hard | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.267 | $0.152 | $0.052 | $0.058 | $0.082 | 230.6k | 93.3k | 71.3k | 52.6k | 131.0k |
| 5-complex-inventory | complex | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.391 | $0.331 | $0.133 | $0.085 | $0.100 | 223.6k | 106.0k | 90.2k | 58.2k | 77.7k |
| 6-hard-semver | hard | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.492 | $0.390 | $0.181 | $0.187 | $0.168 | 299.8k | 132.0k | 121.5k | 144.6k | 125.0k |
| 7-hard-queue | hard | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.236 | $0.137 | $0.052 | $0.047 | $0.053 | 192.9k | 65.2k | 55.7k | 54.8k | 63.7k |
| 8-complex-perf | complex | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | $0.344 | $0.304 | $0.074 | $0.060 | $0.077 | 312.8k | 126.0k | 45.2k | 57.0k | 79.4k |

## Every run (evidence)

Each folder under `runs/` holds `transcript.jsonl` (every message, tool call and tool result of the run), `result.json` (usage, cost and final answer), `grade.json` (every check), `changes.diff` (what the agent changed) and, for tokenfisher arms, `tokenfisher/` (compressed-output stats and the raw outputs it saved).

| run | score | cost | tokens | turns | failed checks |
|---|---|---|---|---|---|
| [1-easy-range__A__r1](runs/1-easy-range__A__r1/) | 8/8 | $0.136 | 124.4k | 4 | – |
| [1-easy-range__A__r2](runs/1-easy-range__A__r2/) | 8/8 | $0.140 | 125.2k | 4 | – |
| [1-easy-range__A__r3](runs/1-easy-range__A__r3/) | 8/8 | $0.137 | 124.5k | 4 | – |
| [1-easy-range__L__r1](runs/1-easy-range__L__r1/) | 8/8 | $0.022 | 36.1k | 4 | – |
| [1-easy-range__L__r2](runs/1-easy-range__L__r2/) | 8/8 | $0.021 | 36.1k | 4 | – |
| [1-easy-range__L__r3](runs/1-easy-range__L__r3/) | 8/8 | $0.022 | 36.1k | 4 | – |
| [1-easy-range__M__r1](runs/1-easy-range__M__r1/) | 8/8 | $0.024 | 42.1k | 4 | – |
| [1-easy-range__M__r2](runs/1-easy-range__M__r2/) | 8/8 | $0.024 | 42.1k | 4 | – |
| [1-easy-range__M__r3](runs/1-easy-range__M__r3/) | 8/8 | $0.024 | 42.1k | 4 | – |
| [1-easy-range__S__r1](runs/1-easy-range__S__r1/) | 8/8 | $0.022 | 36.1k | 4 | – |
| [1-easy-range__S__r2](runs/1-easy-range__S__r2/) | 8/8 | $0.022 | 36.2k | 4 | – |
| [1-easy-range__S__r3](runs/1-easy-range__S__r3/) | 8/8 | $0.022 | 36.1k | 4 | – |
| [1-easy-range__T__r1](runs/1-easy-range__T__r1/) | 8/8 | $0.045 | 36.2k | 4 | – |
| [1-easy-range__T__r2](runs/1-easy-range__T__r2/) | 8/8 | $0.045 | 36.2k | 4 | – |
| [1-easy-range__T__r3](runs/1-easy-range__T__r3/) | 8/8 | $0.044 | 36.1k | 4 | – |
| [2-easy-slugify__A__r1](runs/2-easy-slugify__A__r1/) | 12/12 | $0.208 | 172.7k | 5 | – |
| [2-easy-slugify__A__r2](runs/2-easy-slugify__A__r2/) | 12/12 | $0.216 | 172.4k | 6 | – |
| [2-easy-slugify__A__r3](runs/2-easy-slugify__A__r3/) | 12/12 | $0.217 | 173.4k | 6 | – |
| [2-easy-slugify__L__r1](runs/2-easy-slugify__L__r1/) | 12/12 | $0.037 | 51.5k | 4 | – |
| [2-easy-slugify__L__r2](runs/2-easy-slugify__L__r2/) | 12/12 | $0.043 | 52.6k | 8 | – |
| [2-easy-slugify__L__r3](runs/2-easy-slugify__L__r3/) | 12/12 | $0.045 | 53.5k | 4 | – |
| [2-easy-slugify__M__r1](runs/2-easy-slugify__M__r1/) | 12/12 | $0.057 | 78.3k | 8 | – |
| [2-easy-slugify__M__r2](runs/2-easy-slugify__M__r2/) | 12/12 | $0.055 | 78.1k | 8 | – |
| [2-easy-slugify__M__r3](runs/2-easy-slugify__M__r3/) | 12/12 | $0.055 | 62.6k | 8 | – |
| [2-easy-slugify__S__r1](runs/2-easy-slugify__S__r1/) | 12/12 | $0.052 | 54.3k | 8 | – |
| [2-easy-slugify__S__r2](runs/2-easy-slugify__S__r2/) | 12/12 | $0.050 | 54.2k | 8 | – |
| [2-easy-slugify__S__r3](runs/2-easy-slugify__S__r3/) | 12/12 | $0.034 | 38.9k | 3 | – |
| [2-easy-slugify__T__r1](runs/2-easy-slugify__T__r1/) | 12/12 | $0.115 | 56.7k | 4 | – |
| [2-easy-slugify__T__r2](runs/2-easy-slugify__T__r2/) | 12/12 | $0.110 | 54.1k | 5 | – |
| [2-easy-slugify__T__r3](runs/2-easy-slugify__T__r3/) | 12/12 | $0.109 | 54.0k | 5 | – |
| [3-medium-cart__A__r1](runs/3-medium-cart__A__r1/) | 9/9 | $0.170 | 171.0k | 4 | – |
| [3-medium-cart__A__r2](runs/3-medium-cart__A__r2/) | 9/9 | $0.175 | 171.9k | 5 | – |
| [3-medium-cart__A__r3](runs/3-medium-cart__A__r3/) | 9/9 | $0.171 | 170.7k | 4 | – |
| [3-medium-cart__L__r1](runs/3-medium-cart__L__r1/) | 9/9 | $0.030 | 52.2k | 4 | – |
| [3-medium-cart__L__r2](runs/3-medium-cart__L__r2/) | 9/9 | $0.030 | 52.2k | 4 | – |
| [3-medium-cart__L__r3](runs/3-medium-cart__L__r3/) | 9/9 | $0.031 | 52.3k | 4 | – |
| [3-medium-cart__M__r1](runs/3-medium-cart__M__r1/) | 9/9 | $0.034 | 60.5k | 4 | – |
| [3-medium-cart__M__r2](runs/3-medium-cart__M__r2/) | 9/9 | $0.035 | 60.8k | 4 | – |
| [3-medium-cart__M__r3](runs/3-medium-cart__M__r3/) | 9/9 | $0.035 | 60.9k | 4 | – |
| [3-medium-cart__S__r1](runs/3-medium-cart__S__r1/) | 9/9 | $0.030 | 52.2k | 4 | – |
| [3-medium-cart__S__r2](runs/3-medium-cart__S__r2/) | 9/9 | $0.031 | 52.4k | 4 | – |
| [3-medium-cart__S__r3](runs/3-medium-cart__S__r3/) | 9/9 | $0.032 | 52.5k | 4 | – |
| [3-medium-cart__T__r1](runs/3-medium-cart__T__r1/) | 9/9 | $0.077 | 53.9k | 4 | – |
| [3-medium-cart__T__r2](runs/3-medium-cart__T__r2/) | 9/9 | $0.073 | 53.4k | 4 | – |
| [3-medium-cart__T__r3](runs/3-medium-cart__T__r3/) | 9/9 | $0.077 | 53.8k | 4 | – |
| [4-hard-logs__A__r1](runs/4-hard-logs__A__r1/) | 12/12 | $0.276 | 235.4k | 7 | – |
| [4-hard-logs__A__r2](runs/4-hard-logs__A__r2/) | 12/12 | $0.257 | 227.3k | 7 | – |
| [4-hard-logs__A__r3](runs/4-hard-logs__A__r3/) | 12/12 | $0.269 | 229.1k | 7 | – |
| [4-hard-logs__L__r1](runs/4-hard-logs__L__r1/) | 12/12 | $0.076 | 18.7k | 1 | – |
| [4-hard-logs__L__r2](runs/4-hard-logs__L__r2/) | 12/12 | $0.046 | 68.0k | 5 | – |
| [4-hard-logs__L__r3](runs/4-hard-logs__L__r3/) | 12/12 | $0.050 | 71.2k | 5 | – |
| [4-hard-logs__M__r1](runs/4-hard-logs__M__r1/) | 12/12 | $0.085 | 159.8k | 14 | – |
| [4-hard-logs__M__r2](runs/4-hard-logs__M__r2/) | 12/12 | $0.076 | 121.4k | 14 | – |
| [4-hard-logs__M__r3](runs/4-hard-logs__M__r3/) | 12/12 | $0.084 | 111.8k | 12 | – |
| [4-hard-logs__S__r1](runs/4-hard-logs__S__r1/) | 12/12 | $0.048 | 68.7k | 5 | – |
| [4-hard-logs__S__r2](runs/4-hard-logs__S__r2/) | 12/12 | $0.054 | 71.9k | 5 | – |
| [4-hard-logs__S__r3](runs/4-hard-logs__S__r3/) | 12/12 | $0.055 | 73.3k | 5 | – |
| [4-hard-logs__T__r1](runs/4-hard-logs__T__r1/) | 12/12 | $0.164 | 109.4k | 8 | – |
| [4-hard-logs__T__r2](runs/4-hard-logs__T__r2/) | 12/12 | $0.145 | 92.3k | 7 | – |
| [4-hard-logs__T__r3](runs/4-hard-logs__T__r3/) | 12/12 | $0.148 | 78.2k | 7 | – |
| [5-complex-inventory__A__r1](runs/5-complex-inventory__A__r1/) | 18/18 | $0.468 | 249.5k | 8 | – |
| [5-complex-inventory__A__r2](runs/5-complex-inventory__A__r2/) | 18/18 | $0.337 | 187.4k | 7 | – |
| [5-complex-inventory__A__r3](runs/5-complex-inventory__A__r3/) | 18/18 | $0.368 | 233.8k | 7 | – |
| [5-complex-inventory__L__r1](runs/5-complex-inventory__L__r1/) | 18/18 | $0.087 | 62.7k | 7 | – |
| [5-complex-inventory__L__r2](runs/5-complex-inventory__L__r2/) | 18/18 | $0.081 | 49.1k | 5 | – |
| [5-complex-inventory__L__r3](runs/5-complex-inventory__L__r3/) | 18/18 | $0.087 | 62.8k | 7 | – |
| [5-complex-inventory__M__r1](runs/5-complex-inventory__M__r1/) | 18/18 | $0.104 | 90.8k | 11 | – |
| [5-complex-inventory__M__r2](runs/5-complex-inventory__M__r2/) | 18/18 | $0.102 | 71.8k | 9 | – |
| [5-complex-inventory__M__r3](runs/5-complex-inventory__M__r3/) | 18/18 | $0.095 | 70.6k | 7 | – |
| [5-complex-inventory__S__r1](runs/5-complex-inventory__S__r1/) | 18/18 | $0.084 | 49.0k | 3 | – |
| [5-complex-inventory__S__r2](runs/5-complex-inventory__S__r2/) | 18/18 | $0.147 | 107.0k | 9 | – |
| [5-complex-inventory__S__r3](runs/5-complex-inventory__S__r3/) | 18/18 | $0.169 | 114.5k | 12 | – |
| [5-complex-inventory__T__r1](runs/5-complex-inventory__T__r1/) | 18/18 | $0.239 | 70.8k | 4 | – |
| [5-complex-inventory__T__r2](runs/5-complex-inventory__T__r2/) | 18/18 | $0.387 | 124.9k | 10 | – |
| [5-complex-inventory__T__r3](runs/5-complex-inventory__T__r3/) | 18/18 | $0.365 | 122.4k | 10 | – |
| [6-hard-semver__A__r1](runs/6-hard-semver__A__r1/) | 16/16 | $0.485 | 347.2k | 7 | – |
| [6-hard-semver__A__r2](runs/6-hard-semver__A__r2/) | 16/16 | $0.523 | 301.9k | 7 | – |
| [6-hard-semver__A__r3](runs/6-hard-semver__A__r3/) | 16/16 | $0.467 | 250.2k | 6 | – |
| [6-hard-semver__L__r1](runs/6-hard-semver__L__r1/) | 16/16 | $0.153 | 137.8k | 9 | – |
| [6-hard-semver__L__r2](runs/6-hard-semver__L__r2/) | 16/16 | $0.193 | 119.9k | 10 | – |
| [6-hard-semver__L__r3](runs/6-hard-semver__L__r3/) | 16/16 | $0.214 | 175.9k | 13 | – |
| [6-hard-semver__M__r1](runs/6-hard-semver__M__r1/) | 16/16 | $0.158 | 103.8k | 10 | – |
| [6-hard-semver__M__r2](runs/6-hard-semver__M__r2/) | 16/16 | $0.152 | 104.9k | 10 | – |
| [6-hard-semver__M__r3](runs/6-hard-semver__M__r3/) | 16/16 | $0.195 | 166.3k | 12 | – |
| [6-hard-semver__S__r1](runs/6-hard-semver__S__r1/) | 16/16 | $0.165 | 163.4k | 10 | – |
| [6-hard-semver__S__r2](runs/6-hard-semver__S__r2/) | 16/16 | $0.228 | 105.6k | 9 | – |
| [6-hard-semver__S__r3](runs/6-hard-semver__S__r3/) | 16/16 | $0.151 | 95.5k | 10 | – |
| [6-hard-semver__T__r1](runs/6-hard-semver__T__r1/) | 16/16 | $0.368 | 128.5k | 8 | – |
| [6-hard-semver__T__r2](runs/6-hard-semver__T__r2/) | 16/16 | $0.434 | 160.6k | 11 | – |
| [6-hard-semver__T__r3](runs/6-hard-semver__T__r3/) | 16/16 | $0.369 | 106.8k | 6 | – |
| [7-hard-queue__A__r1](runs/7-hard-queue__A__r1/) | 15/15 | $0.228 | 177.7k | 4 | – |
| [7-hard-queue__A__r2](runs/7-hard-queue__A__r2/) | 15/15 | $0.231 | 176.5k | 5 | – |
| [7-hard-queue__A__r3](runs/7-hard-queue__A__r3/) | 15/15 | $0.250 | 224.5k | 5 | – |
| [7-hard-queue__L__r1](runs/7-hard-queue__L__r1/) | 15/15 | $0.046 | 54.6k | 5 | – |
| [7-hard-queue__L__r2](runs/7-hard-queue__L__r2/) | 15/15 | $0.048 | 54.9k | 5 | – |
| [7-hard-queue__L__r3](runs/7-hard-queue__L__r3/) | 15/15 | $0.047 | 54.9k | 5 | – |
| [7-hard-queue__M__r1](runs/7-hard-queue__M__r1/) | 15/15 | $0.053 | 63.7k | 7 | – |
| [7-hard-queue__M__r2](runs/7-hard-queue__M__r2/) | 15/15 | $0.051 | 63.4k | 6 | – |
| [7-hard-queue__M__r3](runs/7-hard-queue__M__r3/) | 15/15 | $0.055 | 64.0k | 7 | – |
| [7-hard-queue__S__r1](runs/7-hard-queue__S__r1/) | 15/15 | $0.049 | 55.2k | 5 | – |
| [7-hard-queue__S__r2](runs/7-hard-queue__S__r2/) | 15/15 | $0.056 | 56.3k | 6 | – |
| [7-hard-queue__S__r3](runs/7-hard-queue__S__r3/) | 15/15 | $0.051 | 55.6k | 6 | – |
| [7-hard-queue__T__r1](runs/7-hard-queue__T__r1/) | 15/15 | $0.136 | 59.0k | 4 | – |
| [7-hard-queue__T__r2](runs/7-hard-queue__T__r2/) | 15/15 | $0.119 | 58.6k | 4 | – |
| [7-hard-queue__T__r3](runs/7-hard-queue__T__r3/) | 15/15 | $0.156 | 77.9k | 5 | – |
| [8-complex-perf__A__r1](runs/8-complex-perf__A__r1/) | 13/13 | $0.394 | 430.2k | 10 | – |
| [8-complex-perf__A__r2](runs/8-complex-perf__A__r2/) | 13/13 | $0.285 | 183.3k | 4 | – |
| [8-complex-perf__A__r3](runs/8-complex-perf__A__r3/) | 13/13 | $0.353 | 324.7k | 8 | – |
| [8-complex-perf__L__r1](runs/8-complex-perf__L__r1/) | 13/13 | $0.062 | 57.3k | 5 | – |
| [8-complex-perf__L__r2](runs/8-complex-perf__L__r2/) | 13/13 | $0.060 | 57.2k | 8 | – |
| [8-complex-perf__L__r3](runs/8-complex-perf__L__r3/) | 13/13 | $0.057 | 56.5k | 5 | – |
| [8-complex-perf__M__r1](runs/8-complex-perf__M__r1/) | 13/13 | $0.075 | 67.5k | 8 | – |
| [8-complex-perf__M__r2](runs/8-complex-perf__M__r2/) | 13/13 | $0.078 | 86.9k | 9 | – |
| [8-complex-perf__M__r3](runs/8-complex-perf__M__r3/) | 13/13 | $0.076 | 83.9k | 9 | – |
| [8-complex-perf__S__r1](runs/8-complex-perf__S__r1/) | 13/13 | $0.059 | 56.9k | 6 | – |
| [8-complex-perf__S__r2](runs/8-complex-perf__S__r2/) | 13/13 | $0.095 | 20.4k | 1 | – |
| [8-complex-perf__S__r3](runs/8-complex-perf__S__r3/) | 13/13 | $0.068 | 58.4k | 8 | – |
| [8-complex-perf__T__r1](runs/8-complex-perf__T__r1/) | 13/13 | $0.283 | 108.1k | 6 | – |
| [8-complex-perf__T__r2](runs/8-complex-perf__T__r2/) | 13/13 | $0.372 | 145.6k | 8 | – |
| [8-complex-perf__T__r3](runs/8-complex-perf__T__r3/) | 13/13 | $0.257 | 124.4k | 7 | – |

## Caveats

- 3 reps per task: CIs are wide; treat small differences as noise.
- Tasks are small synthetic JS repos; real sessions are longer, so per-request savings (startup context, tool output) compound more there.
- All arms skip user-level settings (personal hooks), so savings from removing per-call hooks are not counted.
- Cost is Claude Code's own estimate at list price.
