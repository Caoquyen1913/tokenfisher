'use strict';

// Lossy-but-safe compression of shell command output before Claude reads it.
// Cleaning (ANSI, progress bars, repeated lines) always applies; truncation only
// kicks in for long output and always keeps the head, the tail and every line
// that looks like an error, plus a little context around it.

const ANSI = /\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;

const IMPORTANT = new RegExp([
  String.raw`\b(?:error|errors|err!|failed|failure|failing|fatal|exception|traceback|panic(?:ked)?)\b`,
  String.raw`\b(?:assert\w*|warning|warn|denied|refused|not found|cannot|can't|unable|undefined)\b`,
  String.raw`\b(?:expected|received|timed? ?out|segfault|killed|abort(?:ed)?)\b`,
  String.raw`[✕✗✖❌]`,
  String.raw`\bE\d{3,5}\b`,
  String.raw`^\s*-->`,
].join('|'), 'i');

const PERCENT = /\d{1,3}(?:\.\d+)?\s?%/;
const BAR = /[█▉▊▋▌▍▎▏░▒▓■□]{3,}|[⠁-⣿]/;
const RATE = /\b(?:ETA|eta|it\/s|s\/it|[kKMG]i?B\/s)\b/;
const SPINNER_ONLY = /^\s*[|\/\\-]\s*$/;

// Whole-command patterns whose exact output Claude needs (diffs, structured data).
const PASSTHROUGH = [
  /\bgit\s+(?:--no-pager\s+)?(?:diff|show|blame|format-patch|cat-file)\b/,
  /\bConvertTo-Json\b/i,
  /--json\b|(?:^|\s)-o\s*json\b|--output[= ]json\b/,
];

// A pipeline segment starting with one of these is a deliberate look at content:
// `cd x && cat -n f | sed -n 50,90p` must reach Claude byte for byte.
const CONTENT_VIEWER = /^(?:cat|nl|head|tail|sed|awk|less|more|bat|type|gc|jq|yq|xxd|od|hexdump|base64|Get-Content|Select-Object|Format-Hex)\b/i;

// Known noisy command families get full treatment (clean + truncate). Anything
// else only gets lossless-ish cleaning, never truncation.
const NOISY = new RegExp('^(?:' + [
  String.raw`(?:npm|pnpm|yarn|bun|npx|bunx)\b`,
  String.raw`(?:pip3?|uv|poetry|pipenv|conda|composer|bundle|gem|brew|choco|winget)\s+(?:install|sync|add|update|upgrade|lock|i)\b`,
  String.raw`(?:pytest|py\.test|tox|nox|jest|vitest|mocha|karma|cypress|playwright)\b`,
  String.raw`node\s+(?:--test\b|\S*test\S*\.[cm]?js\b)`,
  String.raw`(?:python3?|py)\s+(?:-\w+\s+)*-m\s+(?:pytest|unittest|pip|mypy|ruff|pylint|tox)\b`,
  String.raw`(?:go\s+(?:test|build|vet|mod|get|install)|cargo|rustc)\b`,
  String.raw`(?:dotnet\s+(?:build|test|restore|publish|run)|msbuild|mvnw?|\.?/?gradlew?|ant|sbt)\b`,
  String.raw`(?:make|cmake|ninja|bazel)\b`,
  String.raw`(?:tsc|eslint|ruff|mypy|pylint|flake8|prettier|biome|stylelint|rubocop|golangci-lint)\b`,
  String.raw`(?:docker|docker-compose|podman)\s+(?:build|compose|pull|push|logs|run)\b`,
  String.raw`(?:kubectl\s+(?:logs|describe|apply|rollout)|helm|terraform|tofu|pulumi)\b`,
  String.raw`git\s+(?:log|status|fetch|pull|push|clone|checkout|switch|merge|rebase|stash|cherry-pick|submodule|gc)\b`,
  String.raw`gh\s+run\s+(?:view|watch)\b`,
  String.raw`(?:Install-Module|Install-Package|Invoke-Pester)\b`,
].join('|') + ')', 'i');

const BYPASS = /#\s*no-?squash\b|\bTOKENFISHER=off\b/i;

const DEFAULTS = {
  minChars: 1500,     // below this, leave output alone entirely
  fullLines: 60,      // cleaned output up to this many lines is kept whole
  fullChars: 6000,
  headLines: 15,
  tailLines: 40,
  context: 2,
  maxImportant: 120,
  maxLineChars: 1000,
};

function segments(command) {
  return command
    .split(/&&|\|\||[;|\n]/)
    .map((s) => s.trim()
      .replace(/^(?:[A-Za-z_]\w*=(?:"[^"]*"|'[^']*'|\S*)\s+)+/, '') // FOO=bar cmd
      .replace(/^(?:&\s*|time\s+|sudo\s+|exec\s+)/, ''))
    .filter(Boolean);
}

// 'pass' = leave untouched, 'full' = clean + truncate, 'clean' = clean only.
function classify(command) {
  if (!command) return 'clean';
  if (BYPASS.test(command) || PASSTHROUGH.some((re) => re.test(command))) return 'pass';
  const segs = segments(command);
  if (segs.some((s) => CONTENT_VIEWER.test(s))) return 'pass';
  return segs.some((s) => NOISY.test(s)) ? 'full' : 'clean';
}

function isProgress(line) {
  if (SPINNER_ONLY.test(line)) return true;
  return PERCENT.test(line) && (BAR.test(line) || RATE.test(line));
}

function clean(text, opts) {
  const lines = text
    .replace(ANSI, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    // A carriage return redraws the line; only the final redraw is visible.
    .map((l) => (l.includes('\r') ? l.slice(l.lastIndexOf('\r') + 1) : l))
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => !isProgress(l))
    .map((l) => (opts.mode === 'full' && l.length > opts.maxLineChars
      ? `${l.slice(0, opts.maxLineChars)} …[+${l.length - opts.maxLineChars} chars]`
      : l));

  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let j = i + 1;
    while (j < lines.length && lines[j] === line) j++;
    const run = j - i;
    if (line === '') {
      if (out.length && out[out.length - 1] !== '') out.push('');
    } else if (run > 2) {
      out.push(line, `  (previous line repeated ${run - 1} more times)`);
    } else {
      for (let k = 0; k < run; k++) out.push(line);
    }
    i = j;
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  while (out.length && out[0] === '') out.shift();
  return out;
}

function truncate(lines, opts) {
  const n = lines.length;
  const keep = new Uint8Array(n);
  for (let i = 0; i < Math.min(opts.headLines, n); i++) keep[i] = 1;
  for (let i = Math.max(0, n - opts.tailLines); i < n; i++) keep[i] = 1;
  let important = 0;
  for (let i = 0; i < n && important < opts.maxImportant; i++) {
    if (!IMPORTANT.test(lines[i])) continue;
    important++;
    for (let k = Math.max(0, i - opts.context); k <= Math.min(n - 1, i + opts.context); k++) keep[k] = 1;
  }
  const out = [];
  let omitted = 0;
  for (let i = 0; i < n; i++) {
    if (keep[i]) {
      if (omitted) out.push(`… [${omitted} lines omitted]`);
      omitted = 0;
      out.push(lines[i]);
    } else {
      omitted++;
    }
  }
  if (omitted) out.push(`… [${omitted} lines omitted]`);
  return { lines: out, omitted: n - keep.reduce((a, b) => a + b, 0) };
}

// Returns { text, omittedLines, changed }. `text` is what Claude should see.
// options.mode: 'full' (default) cleans and truncates; 'clean' never drops content lines.
function squash(text, options = {}) {
  const opts = { ...DEFAULTS, mode: 'full', ...options };
  if (opts.mode === 'pass' || typeof text !== 'string' || text.length < opts.minChars) {
    return { text, omittedLines: 0, changed: false };
  }
  let lines = clean(text, opts);
  let omittedLines = 0;
  const cleanedChars = lines.join('\n').length;
  if (opts.mode === 'full' && (lines.length > opts.fullLines || cleanedChars > opts.fullChars)) {
    ({ lines, omitted: omittedLines } = truncate(lines, opts));
  }
  const result = lines.join('\n');
  // Not worth rewriting for a marginal gain.
  if (!omittedLines && result.length > text.length * 0.9) {
    return { text, omittedLines: 0, changed: false };
  }
  return { text: result, omittedLines, changed: true };
}

module.exports = { squash, classify, clean, isProgress, DEFAULTS };
