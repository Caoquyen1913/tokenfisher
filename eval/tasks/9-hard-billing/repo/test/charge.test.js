const assert = require('assert');
const { buildChargePayload } = require('../src/payments/gateway/payload');

const customer = { gatewayId: 'cus_1' };

test('USD invoice is charged in cents', () => {
  const p = buildChargePayload({ id: 'i1', number: 'INV-1', currency: 'USD', total: 12.5 }, customer);
  assert.strictEqual(p.amount, 1250);
  assert.strictEqual(p.currency, 'usd');
});

test('EUR invoice is charged in cents', () => {
  const p = buildChargePayload({ id: 'i2', number: 'INV-2', currency: 'EUR', total: 99.99 }, customer);
  assert.strictEqual(p.amount, 9999);
  assert.strictEqual(p.idempotency_key, 'inv_i2');
});
