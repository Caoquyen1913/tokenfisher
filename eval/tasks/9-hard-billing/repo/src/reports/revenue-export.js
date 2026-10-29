'use strict';

const { toCents } = require('../legacy/money');

// CSV for the finance ledger. usdTotal is filled in by the nightly FX job.
function exportRevenue(invoices) {
  const rows = invoices
    .filter((i) => i.status === 'paid')
    .map((i) => [i.number, i.paidAt, toCents(i.usdTotal)].join(','));
  return ['number,paid_at,usd_cents', ...rows].join('\n');
}

module.exports = { exportRevenue };
