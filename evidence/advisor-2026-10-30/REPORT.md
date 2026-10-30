# tokenfisher A/B report

Run started 2026-10-30T02:38:21.081Z · model `opus` · 9 tasks × 2 arms × 3 reps = 54 runs.
Quality = share of grader checks passed (hidden tests + visible suite passes + original tests intact). Cost = `total_cost_usd` reported by `claude -p`.

## Arms

- **P — tokenfisher plugin**: tokenfisher plugin, zero flags: Sonnet main thread with every tool, Opus escalation agent, Haiku scout, policy, output hook
- **Q — plugin + advisor**: P with advisorModel opus: the Sonnet main thread can consult Opus, which reads the whole transcript

Common flags: `-p --output-format stream-json --verbose --no-session-persistence --setting-sources project,local --permission-mode acceptEdits --allowedTools Bash PowerShell Read Edit Write Glob Grep Agent Task --max-budget-usd 5 --plugin-dir`

## Verdict vs baseline

| arm | cost change (95% CI) | quality Δ (95% CI) | quality non-inferior (margin −0.05) | cost cut significant |
|---|---|---|---|---|
| Q plugin + advisor | **+6.5%** (+2.5% … +10.4%) | +0.000 (0.000 … 0.000) | yes | no |

Cost change is 1 − Σcost(arm)/Σcost(baseline) over runs paired by task and rep; CIs are paired bootstrap (4,000 resamples). "Non-inferior" means the lower CI bound of the quality change and every level's mean change are above −margin.

## By arm

| arm | runs | quality | all checks pass | mean cost | total cost | mean tokens | mean output | turns | errors |
|---|---|---|---|---|---|---|---|---|---|
| P tokenfisher plugin | 27 | 100.0% | 100.0% | $0.115 | $3.100 | 192.6k | 3.5k | 8.4 | 0 |
| Q plugin + advisor | 27 | 100.0% | 100.0% | $0.122 | $3.301 | 197.4k | 3.6k | 7.7 | 0 |

## By difficulty (easy → complex)

| level | P quality | Q quality | P cost | Q cost | Q cost vs P |
|---|---|---|---|---|---|
| easy | 100.0% | 100.0% | $0.076 | $0.080 | +5.1% |
| medium | 100.0% | 100.0% | $0.072 | $0.079 | +9.7% |
| hard | 100.0% | 100.0% | $0.139 | $0.146 | +4.9% |
| complex | 100.0% | 100.0% | $0.127 | $0.139 | +9.9% |

## By task

| task | level | P quality | Q quality | P cost | Q cost | P tokens | Q tokens |
|---|---|---|---|---|---|---|---|
| 1-easy-range | easy | 100.0% | 100.0% | $0.055 | $0.061 | 106.7k | 110.2k |
| 2-easy-slugify | easy | 100.0% | 100.0% | $0.097 | $0.099 | 188.2k | 193.8k |
| 3-medium-cart | medium | 100.0% | 100.0% | $0.072 | $0.079 | 172.1k | 179.1k |
| 4-hard-logs | hard | 100.0% | 100.0% | $0.114 | $0.109 | 260.8k | 227.1k |
| 5-complex-inventory | complex | 100.0% | 100.0% | $0.144 | $0.148 | 186.5k | 179.7k |
| 6-hard-semver | hard | 100.0% | 100.0% | $0.236 | $0.245 | 286.9k | 281.8k |
| 7-hard-queue | hard | 100.0% | 100.0% | $0.089 | $0.100 | 150.3k | 157.0k |
| 8-complex-perf | complex | 100.0% | 100.0% | $0.109 | $0.130 | 179.5k | 206.2k |
| 9-hard-billing | hard | 100.0% | 100.0% | $0.116 | $0.128 | 202.5k | 242.0k |

## Every run (evidence)

Each folder under `runs/` holds `transcript.jsonl` (every message, tool call and tool result of the run), `result.json` (usage, cost and final answer), `grade.json` (every check), `changes.diff` (what the agent changed) and, for tokenfisher arms, `tokenfisher/` (compressed-output stats and the raw outputs it saved).

| run | score | cost | tokens | turns | failed checks |
|---|---|---|---|---|---|
| [1-easy-range__P__r1](runs/1-easy-range__P__r1/) | 8/8 | $0.055 | 108.0k | 4 | – |
| [1-easy-range__P__r2](runs/1-easy-range__P__r2/) | 8/8 | $0.055 | 106.2k | 4 | – |
| [1-easy-range__P__r3](runs/1-easy-range__P__r3/) | 8/8 | $0.054 | 106.1k | 4 | – |
| [1-easy-range__Q__r1](runs/1-easy-range__Q__r1/) | 8/8 | $0.061 | 110.2k | 4 | – |
| [1-easy-range__Q__r2](runs/1-easy-range__Q__r2/) | 8/8 | $0.061 | 110.2k | 4 | – |
| [1-easy-range__Q__r3](runs/1-easy-range__Q__r3/) | 8/8 | $0.061 | 110.3k | 4 | – |
| [2-easy-slugify__P__r1](runs/2-easy-slugify__P__r1/) | 12/12 | $0.113 | 229.7k | 9 | – |
| [2-easy-slugify__P__r2](runs/2-easy-slugify__P__r2/) | 12/12 | $0.088 | 148.5k | 8 | – |
| [2-easy-slugify__P__r3](runs/2-easy-slugify__P__r3/) | 12/12 | $0.090 | 186.5k | 8 | – |
| [2-easy-slugify__Q__r1](runs/2-easy-slugify__Q__r1/) | 12/12 | $0.099 | 194.1k | 8 | – |
| [2-easy-slugify__Q__r2](runs/2-easy-slugify__Q__r2/) | 12/12 | $0.100 | 193.6k | 8 | – |
| [2-easy-slugify__Q__r3](runs/2-easy-slugify__Q__r3/) | 12/12 | $0.098 | 193.7k | 8 | – |
| [3-medium-cart__P__r1](runs/3-medium-cart__P__r1/) | 9/9 | $0.076 | 185.2k | 6 | – |
| [3-medium-cart__P__r2](runs/3-medium-cart__P__r2/) | 9/9 | $0.074 | 184.7k | 6 | – |
| [3-medium-cart__P__r3](runs/3-medium-cart__P__r3/) | 9/9 | $0.067 | 146.5k | 4 | – |
| [3-medium-cart__Q__r1](runs/3-medium-cart__Q__r1/) | 9/9 | $0.075 | 153.0k | 4 | – |
| [3-medium-cart__Q__r2](runs/3-medium-cart__Q__r2/) | 9/9 | $0.089 | 232.4k | 7 | – |
| [3-medium-cart__Q__r3](runs/3-medium-cart__Q__r3/) | 9/9 | $0.074 | 152.0k | 4 | – |
| [4-hard-logs__P__r1](runs/4-hard-logs__P__r1/) | 12/12 | $0.113 | 232.6k | 11 | – |
| [4-hard-logs__P__r2](runs/4-hard-logs__P__r2/) | 12/12 | $0.131 | 319.9k | 15 | – |
| [4-hard-logs__P__r3](runs/4-hard-logs__P__r3/) | 12/12 | $0.098 | 229.9k | 6 | – |
| [4-hard-logs__Q__r1](runs/4-hard-logs__Q__r1/) | 12/12 | $0.110 | 239.2k | 7 | – |
| [4-hard-logs__Q__r2](runs/4-hard-logs__Q__r2/) | 12/12 | $0.114 | 243.6k | 6 | – |
| [4-hard-logs__Q__r3](runs/4-hard-logs__Q__r3/) | 12/12 | $0.104 | 198.6k | 6 | – |
| [5-complex-inventory__P__r1](runs/5-complex-inventory__P__r1/) | 18/18 | $0.140 | 159.4k | 10 | – |
| [5-complex-inventory__P__r2](runs/5-complex-inventory__P__r2/) | 18/18 | $0.136 | 197.2k | 8 | – |
| [5-complex-inventory__P__r3](runs/5-complex-inventory__P__r3/) | 18/18 | $0.156 | 202.8k | 12 | – |
| [5-complex-inventory__Q__r1](runs/5-complex-inventory__Q__r1/) | 18/18 | $0.148 | 165.0k | 8 | – |
| [5-complex-inventory__Q__r2](runs/5-complex-inventory__Q__r2/) | 18/18 | $0.144 | 164.6k | 8 | – |
| [5-complex-inventory__Q__r3](runs/5-complex-inventory__Q__r3/) | 18/18 | $0.152 | 209.6k | 11 | – |
| [6-hard-semver__P__r1](runs/6-hard-semver__P__r1/) | 16/16 | $0.209 | 217.7k | 9 | – |
| [6-hard-semver__P__r2](runs/6-hard-semver__P__r2/) | 16/16 | $0.255 | 369.1k | 14 | – |
| [6-hard-semver__P__r3](runs/6-hard-semver__P__r3/) | 16/16 | $0.244 | 273.8k | 11 | – |
| [6-hard-semver__Q__r1](runs/6-hard-semver__Q__r1/) | 16/16 | $0.241 | 281.5k | 10 | – |
| [6-hard-semver__Q__r2](runs/6-hard-semver__Q__r2/) | 16/16 | $0.243 | 282.4k | 11 | – |
| [6-hard-semver__Q__r3](runs/6-hard-semver__Q__r3/) | 16/16 | $0.251 | 281.6k | 11 | – |
| [7-hard-queue__P__r1](runs/7-hard-queue__P__r1/) | 15/15 | $0.087 | 149.9k | 6 | – |
| [7-hard-queue__P__r2](runs/7-hard-queue__P__r2/) | 15/15 | $0.089 | 150.2k | 7 | – |
| [7-hard-queue__P__r3](runs/7-hard-queue__P__r3/) | 15/15 | $0.092 | 150.6k | 6 | – |
| [7-hard-queue__Q__r1](runs/7-hard-queue__Q__r1/) | 15/15 | $0.101 | 156.7k | 7 | – |
| [7-hard-queue__Q__r2](runs/7-hard-queue__Q__r2/) | 15/15 | $0.101 | 156.4k | 6 | – |
| [7-hard-queue__Q__r3](runs/7-hard-queue__Q__r3/) | 15/15 | $0.100 | 157.8k | 6 | – |
| [8-complex-perf__P__r1](runs/8-complex-perf__P__r1/) | 13/13 | $0.099 | 151.8k | 7 | – |
| [8-complex-perf__P__r2](runs/8-complex-perf__P__r2/) | 13/13 | $0.117 | 193.9k | 9 | – |
| [8-complex-perf__P__r3](runs/8-complex-perf__P__r3/) | 13/13 | $0.112 | 193.0k | 9 | – |
| [8-complex-perf__Q__r1](runs/8-complex-perf__Q__r1/) | 13/13 | $0.108 | 157.7k | 7 | – |
| [8-complex-perf__Q__r2](runs/8-complex-perf__Q__r2/) | 13/13 | $0.127 | 159.8k | 7 | – |
| [8-complex-perf__Q__r3](runs/8-complex-perf__Q__r3/) | 13/13 | $0.156 | 301.3k | 12 | – |
| [9-hard-billing__P__r1](runs/9-hard-billing__P__r1/) | 11/11 | $0.107 | 162.2k | 8 | – |
| [9-hard-billing__P__r2](runs/9-hard-billing__P__r2/) | 11/11 | $0.115 | 202.9k | 10 | – |
| [9-hard-billing__P__r3](runs/9-hard-billing__P__r3/) | 11/11 | $0.127 | 242.3k | 15 | – |
| [9-hard-billing__Q__r1](runs/9-hard-billing__Q__r1/) | 11/11 | $0.117 | 209.6k | 10 | – |
| [9-hard-billing__Q__r2](runs/9-hard-billing__Q__r2/) | 11/11 | $0.132 | 258.0k | 11 | – |
| [9-hard-billing__Q__r3](runs/9-hard-billing__Q__r3/) | 11/11 | $0.135 | 258.3k | 13 | – |

## Caveats

- 3 reps per task: CIs are wide; treat small differences as noise.
- Tasks are small synthetic JS repos; real sessions are longer, so per-request savings (startup context, tool output) compound more there.
- All arms skip user-level settings (personal hooks), so savings from removing per-call hooks are not counted.
- Cost is Claude Code's own estimate at list price.
