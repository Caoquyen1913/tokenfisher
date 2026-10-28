const { applyDiscount } = require('./discount');
const { applyTax } = require('./tax');

const round2 = (n) => Math.round(n * 100) / 100;

// Discounts apply to the pre-tax subtotal; tax applies to what is left. A discount
// can bring the subtotal down to zero but never below.
function total(items, { discount, taxRate = 0 } = {}) {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  return round2(applyTax(applyDiscount(subtotal, discount), taxRate));
}

module.exports = { total };
