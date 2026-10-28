const assert = require('assert');
const fs = require('fs');

module.exports = (dir) => {
  const { createStore } = require(`${dir}/src/store`);
  const { createApi } = require(`${dir}/src/api`);
  const setup = (qty = 10) => {
    const clock = { t: 1000 };
    const s = createStore({ clock: () => clock.t });
    s.addItem('A', qty);
    return { s, clock };
  };
  return {
    '1 reserve returns unique string ids': () => {
      const { s } = setup();
      const a = s.reserve('A', 1, 1000);
      const b = s.reserve('A', 1, 1000);
      assert.ok(typeof a === 'string' && typeof b === 'string' && a !== b);
    },
    '1 reserve validates qty': () => {
      const { s } = setup();
      assert.throws(() => s.reserve('A', 0, 1000), /INVALID_QTY/);
      assert.throws(() => s.reserve('A', 2.5, 1000), /INVALID_QTY/);
    },
    '1 reserve beyond available': () => {
      const { s } = setup(5);
      s.reserve('A', 4, 1000);
      assert.throws(() => s.reserve('A', 2, 1000), /INSUFFICIENT_STOCK/);
    },
    '2 available vs physical stock': () => {
      const { s } = setup(10);
      s.reserve('A', 3, 1000);
      assert.strictEqual(s.getAvailable('A'), 7);
      assert.strictEqual(s.getStock('A'), 10);
    },
    '3 expiry boundary is inclusive': () => {
      const { s, clock } = setup(10);
      s.reserve('A', 3, 500);
      clock.t = 1499;
      assert.strictEqual(s.getAvailable('A'), 7);
      clock.t = 1500;
      assert.strictEqual(s.getAvailable('A'), 10);
    },
    '4 confirm sells stock': () => {
      const { s } = setup(10);
      const id = s.reserve('A', 4, 1000);
      s.confirm(id);
      assert.strictEqual(s.getStock('A'), 6);
      assert.strictEqual(s.getAvailable('A'), 6);
      assert.throws(() => s.confirm(id), /RESERVATION_NOT_FOUND/);
    },
    '4 confirm expired': () => {
      const { s, clock } = setup(10);
      const id = s.reserve('A', 4, 100);
      clock.t = 2000;
      assert.throws(() => s.confirm(id), /RESERVATION_EXPIRED/);
      assert.strictEqual(s.getStock('A'), 10);
    },
    '5 release is idempotent': () => {
      const { s } = setup(10);
      const id = s.reserve('A', 4, 1000);
      s.release(id);
      s.release(id);
      s.release('nope');
      assert.strictEqual(s.getAvailable('A'), 10);
      assert.throws(() => s.confirm(id), /RESERVATION_NOT_FOUND/);
    },
    '6 removeItem respects reservations': () => {
      const { s } = setup(10);
      s.reserve('A', 8, 1000);
      assert.throws(() => s.removeItem('A', 3), /INSUFFICIENT_STOCK/);
      s.removeItem('A', 2);
      assert.strictEqual(s.getStock('A'), 8);
    },
    '7 GET /stock shows available': () => {
      const { s } = setup(10);
      s.reserve('A', 3, 1000);
      const res = createApi(s)({ method: 'GET', path: '/stock/A' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.stock, 10);
      assert.strictEqual(res.body.available, 7);
    },
    '8 POST /reservations statuses': () => {
      const { s } = setup(5);
      const api = createApi(s);
      const ok = api({ method: 'POST', path: '/reservations', body: { sku: 'A', qty: 2, ttlMs: 1000 } });
      assert.strictEqual(ok.status, 201);
      assert.strictEqual(typeof ok.body.id, 'string');
      assert.deepStrictEqual(api({ method: 'POST', path: '/reservations', body: { sku: 'A', qty: 9, ttlMs: 1000 } }), { status: 409, body: { error: 'INSUFFICIENT_STOCK' } });
      assert.deepStrictEqual(api({ method: 'POST', path: '/reservations', body: { sku: 'A', qty: 0, ttlMs: 1000 } }), { status: 400, body: { error: 'INVALID_QTY' } });
    },
    '9 POST confirm statuses': () => {
      const { s, clock } = setup(5);
      const api = createApi(s);
      const id = api({ method: 'POST', path: '/reservations', body: { sku: 'A', qty: 2, ttlMs: 1000 } }).body.id;
      assert.deepStrictEqual(api({ method: 'POST', path: `/reservations/${id}/confirm` }), { status: 200, body: { sku: 'A', stock: 3 } });
      assert.deepStrictEqual(api({ method: 'POST', path: `/reservations/${id}/confirm` }), { status: 404, body: { error: 'RESERVATION_NOT_FOUND' } });
      const id2 = api({ method: 'POST', path: '/reservations', body: { sku: 'A', qty: 1, ttlMs: 10 } }).body.id;
      clock.t += 50;
      assert.deepStrictEqual(api({ method: 'POST', path: `/reservations/${id2}/confirm` }), { status: 410, body: { error: 'RESERVATION_EXPIRED' } });
    },
    '10 DELETE /reservations/:id': () => {
      const { s } = setup(5);
      const api = createApi(s);
      const id = api({ method: 'POST', path: '/reservations', body: { sku: 'A', qty: 2, ttlMs: 1000 } }).body.id;
      assert.strictEqual(api({ method: 'DELETE', path: `/reservations/${id}` }).status, 204);
      assert.strictEqual(s.getAvailable('A'), 5);
    },
    'existing behavior kept': () => {
      const api = createApi(createStore());
      assert.strictEqual(api({ method: 'POST', path: '/stock', body: { sku: 'z', qty: 2 } }).status, 201);
      assert.strictEqual(api({ method: 'GET', path: '/nope' }).status, 404);
    },
    'tests added for reservations': () => {
      const src = fs.readdirSync(`${dir}/test`).filter((f) => f.endsWith('.test.js'))
        .map((f) => fs.readFileSync(`${dir}/test/${f}`, 'utf8')).join('\n');
      assert.ok(/reserve/.test(src) && /confirm/.test(src), 'no tests for reserve/confirm');
    },
  };
};
