// Minimal test runner (no dependencies): `node test/run.js` runs every test/*.test.js.
// Tests may be async; each gets 5 s before it counts as hung.
const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = 5000;
const tests = [];
global.test = (name, fn) => tests.push({ name, fn });
for (const f of fs.readdirSync(__dirname).filter((x) => x.endsWith('.test.js')).sort()) {
  require(path.join(__dirname, f));
}

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS} ms`)), TIMEOUT_MS); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

(async () => {
  let failed = 0;
  for (const t of tests) {
    try {
      await withTimeout(Promise.resolve().then(t.fn));
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${t.name}`);
      console.log(`    ${String(e && e.message).split('\n').join('\n    ')}`);
    }
  }
  console.log(`\nTests: ${failed} failed, ${tests.length - failed} passed, ${tests.length} total`);
  // Exit explicitly: a hung test may leave timers or promises behind.
  process.exit(failed ? 1 : 0);
})();
