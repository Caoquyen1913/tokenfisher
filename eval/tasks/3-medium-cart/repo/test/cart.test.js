const assert = require('assert');
const { total } = require('../src/cart');

const round2 = (n) => Math.round(n * 100) / 100;

// Broad sweep over percent discounts and tax rates.
for (let price = 5; price <= 100; price += 5) {
  for (const pct of [0, 10, 25, 50]) {
    for (const taxRate of [0, 0.08, 0.1]) {
      test(`price ${price}, ${pct}% off, tax ${taxRate}`, () => {
        const expected = round2(price * 2 * (1 - pct / 100) * (1 + taxRate));
        assert.strictEqual(total([{ price, qty: 2 }], { discount: { type: 'percent', value: pct }, taxRate }), expected);
      });
    }
  }
}

test('no discount, no tax', () => assert.strictEqual(total([{ price: 10, qty: 3 }]), 30));
test('fixed discount comes off before tax', () => {
  assert.strictEqual(total([{ price: 50, qty: 2 }], { discount: { type: 'fixed', value: 20 }, taxRate: 0.1 }), 88);
});
test('fixed discount larger than subtotal gives zero', () => {
  assert.strictEqual(total([{ price: 5, qty: 1 }], { discount: { type: 'fixed', value: 20 }, taxRate: 0.1 }), 0);
});
