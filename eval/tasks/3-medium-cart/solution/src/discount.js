// discount: { type: 'percent', value: 0..100 } | { type: 'fixed', value: amount } | undefined
function applyDiscount(amount, discount) {
  if (!discount) return amount;
  if (discount.type === 'percent') return amount * (1 - discount.value / 100);
  if (discount.type === 'fixed') return Math.max(0, amount - discount.value);
  throw new Error(`Unknown discount type: ${discount.type}`);
}

module.exports = { applyDiscount };
