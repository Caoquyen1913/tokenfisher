const { parseAmount } = require('./money');

// order: { id, items: [{ sku, price: "12.50", qty }] }
function checkout(order) {
  const totalCents = order.items.reduce((sum, it) => sum + parseAmount(it.price) * it.qty, 0);
  return { orderId: order.id, totalCents };
}

module.exports = { checkout };
