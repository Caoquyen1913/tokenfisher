'use strict';

// Consumption-tax rates by billing country. Unknown countries are not taxed.
const RATES = { US: 0, DE: 0.19, FR: 0.2, GB: 0.2, JP: 0.1, KR: 0.1, VN: 0.1, SG: 0.09, AU: 0.1, CH: 0.081 };

function rateFor(country) {
  return RATES[country] || 0;
}

module.exports = { rateFor };
