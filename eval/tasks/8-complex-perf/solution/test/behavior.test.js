const assert = require('assert');
const { summarize } = require('../src/report');

const order = (id, customerId, status, amountCents, createdAt, currency = 'USD') => ({ id, customerId, status, amountCents, currency, createdAt });

test('duplicate ids, failed orders, EUR rounding and code-unit tie order are preserved', () => {
  const t = '2026-10-01T10:00:00Z';
  const report = summarize([
    order('o1', 'cus_b', 'paid', 1001, t, 'EUR'),
    order('o1', 'cus_a', 'paid', 9999, t),
    order('o2', 'cus_B', 'paid', 1081, t),
    order('o3', 'cus_B', 'failed', 500, '2026-10-01T09:00:00Z'),
  ]);
  assert.deepStrictEqual(report, [
    { rank: 1, customerId: 'cus_B', spendCents: 1081, orderCount: 2, firstOrderAt: '2026-10-01T09:00:00Z' },
    { rank: 2, customerId: 'cus_b', spendCents: 1081, orderCount: 1, firstOrderAt: t },
  ]);
});
