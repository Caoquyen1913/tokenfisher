const assert = require('assert');
const { summarize } = require('../src/report');

const order = (id, customerId, status, amountCents, createdAt, currency = 'USD') => ({ id, customerId, status, amountCents, currency, createdAt });

test('ranks customers by paid spend', () => {
  const report = summarize([
    order('o1', 'cus_a', 'paid', 500, '2026-10-01T10:00:00Z'),
    order('o2', 'cus_b', 'paid', 900, '2026-10-01T11:00:00Z'),
    order('o3', 'cus_a', 'paid', 600, '2026-10-01T12:00:00Z'),
  ]);
  assert.deepStrictEqual(report.map((r) => [r.rank, r.customerId, r.spendCents]), [[1, 'cus_a', 1100], [2, 'cus_b', 900]]);
});

test('respects the limit', () => {
  const orders = Array.from({ length: 30 }, (_, i) => order(`o${i}`, `cus_${i}`, 'paid', 100 + i, '2026-10-01T10:00:00Z'));
  assert.strictEqual(summarize(orders).length, 10);
  assert.strictEqual(summarize(orders, 3).length, 3);
});
