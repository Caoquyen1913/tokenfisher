const assert = require('assert');
const { createStore } = require('../src/store');

for (let n = 1; n <= 60; n++) {
  test(`add then read stock for SKU-${n}`, () => {
    const s = createStore();
    s.addItem(`SKU-${n}`, n);
    s.addItem(`SKU-${n}`, 1);
    assert.strictEqual(s.getStock(`SKU-${n}`), n + 1);
  });
  test(`remove part of stock for SKU-${n}`, () => {
    const s = createStore();
    s.addItem(`SKU-${n}`, n + 5);
    s.removeItem(`SKU-${n}`, 5);
    assert.strictEqual(s.getStock(`SKU-${n}`), n);
  });
}

test('unknown sku has zero stock', () => assert.strictEqual(createStore().getStock('nope'), 0));
test('cannot remove more than stock', () => {
  const s = createStore();
  s.addItem('A', 2);
  assert.throws(() => s.removeItem('A', 3), /INSUFFICIENT_STOCK/);
});
test('quantities must be positive integers', () => {
  const s = createStore();
  assert.throws(() => s.addItem('A', 0), /INVALID_QTY/);
  assert.throws(() => s.addItem('A', 1.5), /INVALID_QTY/);
});
