'use strict';

const log = require('../lib/log');
const { buildChargePayload } = require('./gateway/payload');

// Charges an open invoice on the customer's saved card and marks it paid.
async function chargeInvoice(invoice, { customers, gateway, audit }) {
  if (invoice.status !== 'open') throw new Error(`Invoice ${invoice.number} is ${invoice.status}`);
  const customer = await customers.get(invoice.customerId);
  if (!customer || !customer.gatewayId) throw new Error(`No card on file for ${invoice.customerId}`);

  const payload = buildChargePayload(invoice, customer);
  const charge = await gateway.createCharge(payload);
  log.info('invoice charged', { invoice: invoice.number, charge: charge.id });

  if (audit) await audit.record('invoice.charged', { invoiceId: invoice.id, chargeId: charge.id, amount: payload.amount });
  return { ...invoice, status: 'paid', chargeId: charge.id };
}

module.exports = { chargeInvoice };
