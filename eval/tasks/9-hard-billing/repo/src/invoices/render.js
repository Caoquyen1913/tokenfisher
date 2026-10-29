'use strict';

// Text used by the PDF and the invoice email.
function formatMoney(amount, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function renderInvoice(invoice) {
  const lines = invoice.lines.map((l) => `${l.description}  x${l.qty}  ${formatMoney(l.unitPrice * l.qty, invoice.currency)}`);
  return [
    `Invoice ${invoice.number}`,
    ...lines,
    `Subtotal: ${formatMoney(invoice.subtotal, invoice.currency)}`,
    `Tax: ${formatMoney(invoice.tax, invoice.currency)}`,
    `Total: ${formatMoney(invoice.total, invoice.currency)}`,
  ].join('\n');
}

module.exports = { formatMoney, renderInvoice };
