const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { generate } = require('./data');
const reference = require('./reference');

const same = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));

module.exports = (dir) => {
  const { summarize } = require(`${dir}/src/report`);
  const order = (id, customerId, status, amountCents, createdAt, currency = 'USD') => ({ id, customerId, status, amountCents, currency, createdAt });
  return {
    'identical output on random days (5 seeds)': () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const orders = generate(3000, seed);
        same(summarize(orders), reference.summarize(orders));
        same(summarize(orders, 50), reference.summarize(orders, 50));
      }
    },
    'identical output with every customer listed': () => {
      const orders = generate(2000, 9, 300);
      same(summarize(orders, 1000), reference.summarize(orders, 1000));
    },
    'duplicate ids: first delivery wins': () => {
      const orders = [
        order('o1', 'cus_a', 'paid', 100, '2026-10-01T10:00:00Z'),
        order('o1', 'cus_b', 'paid', 900, '2026-10-01T09:00:00Z'),
        order('o2', 'cus_b', 'paid', 50, '2026-10-01T11:00:00Z'),
      ];
      same(summarize(orders), reference.summarize(orders));
    },
    'failed and pending count as orders, not spend': () => {
      const orders = [
        order('o1', 'cus_a', 'paid', 100, '2026-10-01T10:00:00Z'),
        order('o2', 'cus_a', 'failed', 900, '2026-10-01T08:00:00Z'),
        order('o3', 'cus_a', 'pending', 900, '2026-10-01T07:00:00Z'),
        order('o4', 'cus_a', 'refunded', 900, '2026-10-01T06:00:00Z'),
      ];
      same(summarize(orders), reference.summarize(orders));
    },
    'EUR rounds per order': () => {
      const orders = [1, 2, 3].map((i) => order(`o${i}`, 'cus_a', 'paid', 1001, '2026-10-01T10:00:00Z', 'EUR'));
      same(summarize(orders), reference.summarize(orders));
    },
    'ties: first order time, then code-unit order of ids': () => {
      const t = '2026-10-01T10:00:00Z';
      const orders = [
        order('o1', 'cus_b', 'paid', 100, t), order('o2', 'cus_B', 'paid', 100, t), order('o3', 'cus_a', 'paid', 100, t),
        order('o4', 'cus_A', 'paid', 100, '2026-10-01T09:00:00Z'), order('o5', 'cus_Z', 'paid', 100, t),
      ];
      same(summarize(orders), reference.summarize(orders));
    },
    'zero-spend customers left out; empty input': () => {
      same(summarize([order('o1', 'cus_a', 'pending', 100, '2026-10-01T10:00:00Z')]), []);
      same(summarize([]), []);
    },
    'does not mutate the input': () => {
      const orders = generate(500, 7);
      const before = JSON.stringify(orders);
      summarize(orders);
      assert.strictEqual(JSON.stringify(orders), before);
    },
    'fast on 200,000 orders': () => {
      // Runs in a child process so a slow implementation can be killed.
      const script = `
        const { generate } = require(${JSON.stringify(path.join(__dirname, 'data.js'))});
        const { summarize } = require(${JSON.stringify(`${dir}/src/report`)});
        const orders = generate(200000, 11);
        const t0 = process.hrtime.bigint();
        summarize(orders);
        console.log(Number(process.hrtime.bigint() - t0) / 1e6);`;
      const r = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 15000 });
      if (r.error || r.status !== 0) throw new Error(`did not finish within 15 s (${r.error ? r.error.code : r.stderr.slice(0, 200)})`);
      const ms = Number(r.stdout.trim());
      assert.ok(ms < 1500, `took ${ms.toFixed(0)} ms`);
    },
    'regression test added': () => {
      const src = fs.readdirSync(`${dir}/test`).filter((f) => f.endsWith('.test.js'))
        .map((f) => fs.readFileSync(`${dir}/test/${f}`, 'utf8')).join('\n');
      const orig = fs.readFileSync(path.join(__dirname, '..', 'repo', 'test', 'report.test.js'), 'utf8');
      assert.ok(src.length > orig.length + 200, 'no meaningful test was added');
    },
  };
};
