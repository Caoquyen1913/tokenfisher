// Minimal test runner (no dependencies): `node test/run.js` runs every test/*.test.js.
const fs = require('fs');
const path = require('path');

const tests = [];
global.test = (name, fn) => tests.push({ name, fn });
for (const f of fs.readdirSync(__dirname).filter((x) => x.endsWith('.test.js')).sort()) {
  require(path.join(__dirname, f));
}
let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`  ✓ ${t.name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${t.name}`);
    console.log(`    ${String(e.message).split('\n').join('\n    ')}`);
  }
}
console.log(`\nTests: ${failed} failed, ${tests.length - failed} passed, ${tests.length} total`);
process.exitCode = failed ? 1 : 0;
