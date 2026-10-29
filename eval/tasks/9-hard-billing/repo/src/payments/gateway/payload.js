'use strict';

const { toMinor } = require('../../lib/money/minor');
const { toGatewayCurrency } = require('../../lib/currency/normalize');

// Body of POST /v1/charges on the card gateway.
function buildChargePayload(invoice, customer) {
  const currency = toGatewayCurrency(invoice.currency);
  return {
    amount: toMinor(invoice.total, currency),
    currency,
    customer: customer.gatewayId,
    description: `Invoice ${invoice.number}`,
    metadata: { invoice_id: invoice.id },
    idempotency_key: `inv_${invoice.id}`,
  };
}

module.exports = { buildChargePayload };
