const assert = require('assert');
const { computeTotals } = require('../src/invoices/totals');
const { renderInvoice } = require('../src/invoices/render');

test('JPY totals have no decimals', () => {
  const t = computeTotals([{ description: 'Plan', unitPrice: 1364, qty: 1 }], { currency: 'JPY', country: 'JP' });
  assert.deepStrictEqual(t, { currency: 'JPY', subtotal: 1364, tax: 136, total: 1500 });
});

test('EUR totals round to cents', () => {
  const t = computeTotals([{ description: 'Seat', unitPrice: 9.99, qty: 3 }], { currency: 'EUR', country: 'DE' });
  assert.deepStrictEqual(t, { currency: 'EUR', subtotal: 29.97, tax: 5.69, total: 35.66 });
});

test('JPY invoice renders yen', () => {
  const text = renderInvoice({ number: 'INV-9', currency: 'JPY', lines: [{ description: 'Plan', unitPrice: 1364, qty: 1 }], subtotal: 1364, tax: 136, total: 1500 });
  assert.ok(text.includes('Total: ¥1,500'), text);
});
