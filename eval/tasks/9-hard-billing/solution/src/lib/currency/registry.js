'use strict';

// ISO 4217 currencies we bill in, with their minor-unit exponent.
// Codes are upper-case, as stored on invoices and plans.
const CURRENCIES = {
  USD: { exponent: 2, symbol: '$' },
  EUR: { exponent: 2, symbol: '€' },
  GBP: { exponent: 2, symbol: '£' },
  CHF: { exponent: 2, symbol: 'CHF' },
  AUD: { exponent: 2, symbol: 'A$' },
  SGD: { exponent: 2, symbol: 'S$' },
  JPY: { exponent: 0, symbol: '¥' },
  KRW: { exponent: 0, symbol: '₩' },
  VND: { exponent: 0, symbol: '₫' },
  CLP: { exponent: 0, symbol: 'CLP$' },
  BHD: { exponent: 3, symbol: 'BD' },
  KWD: { exponent: 3, symbol: 'KD' },
};

const DEFAULT_EXPONENT = 2;

function exponent(code) {
  const c = CURRENCIES[String(code).toUpperCase()];
  return c ? c.exponent : DEFAULT_EXPONENT;
}

function isSupported(code) {
  return Object.prototype.hasOwnProperty.call(CURRENCIES, code);
}

function symbol(code) {
  return CURRENCIES[code] ? CURRENCIES[code].symbol : code;
}

module.exports = { exponent, isSupported, symbol, DEFAULT_EXPONENT };
