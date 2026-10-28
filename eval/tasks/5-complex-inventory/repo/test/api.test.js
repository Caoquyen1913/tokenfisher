const assert = require('assert');
const { createStore } = require('../src/store');
const { createApi } = require('../src/api');

for (let n = 1; n <= 40; n++) {
  test(`POST /stock then GET /stock for item-${n}`, () => {
    const api = createApi(createStore());
    assert.strictEqual(api({ method: 'POST', path: '/stock', body: { sku: `item-${n}`, qty: n } }).status, 201);
    const res = api({ method: 'GET', path: `/stock/item-${n}` });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.stock, n);
  });
}

test('POST /stock rejects bad qty', () => {
  const api = createApi(createStore());
  assert.deepStrictEqual(api({ method: 'POST', path: '/stock', body: { sku: 'x', qty: -1 } }), { status: 400, body: { error: 'INVALID_QTY' } });
});
test('unknown route is 404', () => assert.strictEqual(createApi(createStore())({ method: 'GET', path: '/nope' }).status, 404));
