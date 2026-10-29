const assert = require('assert');
const { buildChargePayload } = require('../src/payments/gateway/payload');

test('JPY invoice is charged in yen, not 100x', () => {
  const p = buildChargePayload({ id: 'i3', number: 'INV-3', currency: 'JPY', total: 1500 }, { gatewayId: 'cus_1' });
  assert.strictEqual(p.amount, 1500);
  assert.strictEqual(p.currency, 'jpy');
});
