const assert = require('assert');

module.exports = (dir) => {
  const { total } = require(`${dir}/src/cart`);
  // Only observable cart behavior is checked: clamping in cart.js or in discount.js are both valid fixes.
  return {
    'fixed discount before tax': () => assert.strictEqual(total([{ price: 100, qty: 1 }], { discount: { type: 'fixed', value: 30 }, taxRate: 0.2 }), 84),
    'fixed discount never below zero': () => assert.strictEqual(total([{ price: 3, qty: 2 }], { discount: { type: 'fixed', value: 10 }, taxRate: 0.08 }), 0),
    'fixed discount equal to subtotal': () => assert.strictEqual(total([{ price: 4, qty: 2 }], { discount: { type: 'fixed', value: 8 }, taxRate: 0.1 }), 0),
    'percent discount with tax': () => assert.strictEqual(total([{ price: 19.99, qty: 3 }], { discount: { type: 'percent', value: 15 }, taxRate: 0.08 }), 55.05),
    'multiple items no discount': () => assert.strictEqual(total([{ price: 1.1, qty: 3 }, { price: 2.25, qty: 2 }], { taxRate: 0.1 }), 8.58),
    'unknown discount type still throws': () => assert.throws(() => total([{ price: 1, qty: 1 }], { discount: { type: 'bogus', value: 1 } })),
  };
};
