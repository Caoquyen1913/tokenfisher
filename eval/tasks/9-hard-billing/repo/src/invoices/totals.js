'use strict';

const { roundMajor } = require('../lib/money/minor');
const { rateFor } = require('../tax/rates');

// lines: [{ description, unitPrice, qty }] in the invoice currency (major units).
function computeTotals(lines, { currency, country }) {
  const subtotal = roundMajor(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0), currency);
  const tax = roundMajor(subtotal * rateFor(country), currency);
  return { currency, subtotal, tax, total: roundMajor(subtotal + tax, currency) };
}

module.exports = { computeTotals };
