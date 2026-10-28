const assert = require('assert');
const { parseAmount, formatCents } = require('../src/money');
const { checkout } = require('../src/checkout');

test('parses whole amounts', () => assert.strictEqual(parseAmount('7'), 700));
test('parses cents', () => assert.strictEqual(parseAmount('12.50'), 1250));
test('formats cents', () => assert.strictEqual(formatCents(1250), '12.50'));
test('checkout sums items', () => {
  assert.deepStrictEqual(checkout({ id: 'o1', items: [{ sku: 'A', price: '2.50', qty: 2 }] }), { orderId: 'o1', totalCents: 500 });
});
