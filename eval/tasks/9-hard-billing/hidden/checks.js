const assert = require('assert');
const fs = require('fs');

module.exports = (dir) => {
  const { buildChargePayload } = require(`${dir}/src/payments/gateway/payload`);
  const { chargeInvoice } = require(`${dir}/src/payments/charge-service`);
  const { computeTotals } = require(`${dir}/src/invoices/totals`);
  const customer = { gatewayId: 'cus_1' };
  const pay = (currency, total) => buildChargePayload({ id: 'i1', number: 'INV-1', currency, total }, customer);

  return {
    'JPY charged in yen': () => assert.strictEqual(pay('JPY', 1500).amount, 1500),
    'KRW charged in won': () => assert.strictEqual(pay('KRW', 25000).amount, 25000),
    'BHD charged in fils (3 decimals)': () => assert.strictEqual(pay('BHD', 1.234).amount, 1234),
    'USD still charged in cents': () => assert.strictEqual(pay('USD', 12.5).amount, 1250),
    'gateway currency stays lower-case': () => assert.strictEqual(pay('JPY', 1500).currency, 'jpy'),
    'chargeInvoice sends the yen amount': async () => {
      let sent;
      const gateway = { createCharge: async (p) => { sent = p; return { id: 'ch_1' }; } };
      const customers = { get: async () => customer };
      const out = await chargeInvoice({ id: 'i9', number: 'INV-9', status: 'open', customerId: 'c1', currency: 'JPY', total: 1500 }, { customers, gateway });
      assert.strictEqual(sent.amount, 1500);
      assert.strictEqual(out.status, 'paid');
    },
    'invoice totals unchanged': () => assert.deepStrictEqual(
      computeTotals([{ description: 'Plan', unitPrice: 1364, qty: 1 }], { currency: 'JPY', country: 'JP' }),
      { currency: 'JPY', subtotal: 1364, tax: 136, total: 1500 }),
    'regression test added': () => {
      const src = fs.readdirSync(`${dir}/test`).filter((f) => f.endsWith('.test.js'))
        .map((f) => fs.readFileSync(`${dir}/test/${f}`, 'utf8'))
        .filter((s) => /buildChargePayload|chargeInvoice|createCharge/.test(s));
      assert.ok(src.some((s) => /JPY|KRW|VND|CLP|jpy|krw|vnd|clp/.test(s)), 'no charge test uses a zero-decimal currency');
    },
  };
};
