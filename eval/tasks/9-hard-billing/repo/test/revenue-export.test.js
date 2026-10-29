const assert = require('assert');
const { exportRevenue } = require('../src/reports/revenue-export');

test('revenue export lists paid invoices in USD cents', () => {
  const csv = exportRevenue([
    { number: 'INV-1', status: 'paid', paidAt: '2026-10-01', usdTotal: 10.05 },
    { number: 'INV-2', status: 'open', paidAt: null, usdTotal: 99 },
  ]);
  assert.strictEqual(csv, 'number,paid_at,usd_cents\nINV-1,2026-10-01,1005');
});
