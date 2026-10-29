'use strict';

const { exponent } = require('../currency/registry');

// Major units (12.5 dollars, 1500 yen) to integer minor units (1250 cents, 1500 yen).
function toMinor(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${amount}`);
  return Math.round(n * 10 ** exponent(currency));
}

function fromMinor(minor, currency) {
  return minor / 10 ** exponent(currency);
}

// Round a major-unit amount to what the currency can represent.
function roundMajor(amount, currency) {
  return fromMinor(toMinor(amount, currency), currency);
}

module.exports = { toMinor, fromMinor, roundMajor };
