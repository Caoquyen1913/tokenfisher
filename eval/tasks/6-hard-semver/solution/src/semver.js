// See docs/SPEC.md.
const NUM = '0|[1-9]\\d*';
const IDENT = '[0-9A-Za-z-]+';
const PRE = `(?:-(${IDENT}(?:\\.${IDENT})*))?`;
const BUILD = `(?:\\+${IDENT}(?:\\.${IDENT})*)?`;
const FULL = new RegExp(`^v?(${NUM})\\.(${NUM})\\.(${NUM})${PRE}${BUILD}$`);
const XR = `${NUM}|x|X|\\*`;
const PARTIAL = new RegExp(`^v?(${XR})(?:\\.(${XR})(?:\\.(${XR})${PRE}${BUILD})?)?$`);

function parseVersion(v) {
  if (typeof v !== 'string') return null;
  const m = FULL.exec(v.trim());
  return m ? { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : [] } : null;
}

// Partial version: null for wildcard or missing parts. Undefined if not a version at all.
function parsePartial(s) {
  const m = PARTIAL.exec(s);
  if (!m) return undefined;
  const part = (x) => (x === undefined || /^[xX*]$/.test(x) ? null : +x);
  const p = { major: part(m[1]), minor: part(m[2]), patch: part(m[3]), pre: m[4] ? m[4].split('.') : [] };
  if (p.major === null) p.minor = p.patch = null;
  if (p.minor === null) p.patch = null;
  if (p.pre.length && p.patch === null) return undefined;
  return p;
}

const isNum = (x) => /^\d+$/.test(x);
function cmpIdent(a, b) {
  if (isNum(a) && isNum(b)) return Math.sign(+a - +b);
  if (isNum(a)) return -1;
  if (isNum(b)) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function compare(a, b) {
  for (const k of ['major', 'minor', 'patch']) if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1;
  if (!a.pre.length || !b.pre.length) return b.pre.length - a.pre.length && (a.pre.length ? -1 : 1);
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    if (i >= a.pre.length) return -1;
    if (i >= b.pre.length) return 1;
    const c = cmpIdent(a.pre[i], b.pre[i]);
    if (c) return c;
  }
  return 0;
}

const v = (major, minor, patch, pre = []) => ({ major, minor, patch, pre });
const c = (op, ver) => ({ op, ver });

// Lower bound for a partial (missing parts become 0).
const floor = (p) => v(p.major, p.minor ?? 0, p.patch ?? 0, p.pre);
// Exclusive upper bound covering everything inside a partial.
const ceil = (p) => (p.minor === null ? v(p.major + 1, 0, 0) : v(p.major, p.minor + 1, 0));

function xrange(p) {
  if (p.major === null) return [];
  if (p.patch === null) return [c('>=', floor(p)), c('<', ceil(p))];
  return [c('=', p)];
}

function comparator(token) {
  let m;
  if ((m = /^~(.*)$/.exec(token))) {
    const p = parsePartial(m[1]);
    if (!p) return undefined;
    if (p.major === null) return [];
    const upper = p.minor === null ? v(p.major + 1, 0, 0) : v(p.major, p.minor + 1, 0);
    return [c('>=', floor(p)), c('<', upper)];
  }
  if ((m = /^\^(.*)$/.exec(token))) {
    const p = parsePartial(m[1]);
    if (!p) return undefined;
    if (p.major === null) return [];
    let upper;
    if (p.major > 0 || p.minor === null) upper = v(p.major + 1, 0, 0);
    else if (p.minor > 0 || p.patch === null) upper = v(0, p.minor + 1, 0);
    else upper = v(0, 0, p.patch + 1);
    return [c('>=', floor(p)), c('<', upper)];
  }
  m = /^(<=|>=|<|>|=)?(.*)$/.exec(token);
  const op = m[1] || '=';
  const p = parsePartial(m[2]);
  if (!p) return undefined;
  if (op === '=' || p.patch !== null) return op === '=' ? xrange(p) : [c(op, p)];
  if (p.major === null) return op === '>=' || op === '<=' ? [] : undefined;
  switch (op) {
    case '>': return [c('>=', ceil(p))];
    case '>=': return [c('>=', floor(p))];
    case '<': return [c('<', floor(p))];
    case '<=': return [c('<', ceil(p))];
    default: return undefined;
  }
}

function parseSet(set) {
  const s = set.trim().replace(/(<=|>=|<|>|=|~|\^)\s+/g, '$1');
  const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(s);
  if (hyphen) {
    const a = parsePartial(hyphen[1]);
    const b = parsePartial(hyphen[2]);
    if (!a || !b) return undefined;
    const out = a.major === null ? [] : [c('>=', floor(a))];
    if (b.major !== null) out.push(b.patch === null ? c('<', ceil(b)) : c('<=', b));
    return out;
  }
  if (s === '') return [];
  const out = [];
  for (const token of s.split(/\s+/)) {
    const cs = comparator(token);
    if (!cs) return undefined;
    out.push(...cs);
  }
  return out;
}

function test(ver, { op, ver: bound }) {
  const r = compare(ver, bound);
  return { '<': r < 0, '<=': r <= 0, '>': r > 0, '>=': r >= 0, '=': r === 0 }[op];
}

function satisfies(version, range) {
  const ver = parseVersion(version);
  if (!ver || typeof range !== 'string') return false;
  const sets = range.split('||').map(parseSet);
  if (sets.some((s) => s === undefined)) return false;
  return sets.some((set) => {
    if (!set.every((cmp) => test(ver, cmp))) return false;
    if (!ver.pre.length) return true;
    return set.some(({ ver: b }) => b.pre.length && b.major === ver.major && b.minor === ver.minor && b.patch === ver.patch);
  });
}

module.exports = { satisfies };
