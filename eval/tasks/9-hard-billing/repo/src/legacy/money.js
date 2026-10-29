'use strict';

// Pre-2024 helper, kept for the revenue ledger, which is always in USD.
function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

module.exports = { toCents };
