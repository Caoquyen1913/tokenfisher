// Top-customers report for the finance dashboard.
// orders: [{ id, customerId, status, amountCents, currency: 'USD' | 'EUR', createdAt: ISO-8601 string }]
const EUR_TO_USD = 1.08;

function byRank(a, b) {
  if (a.spendCents !== b.spendCents) return b.spendCents - a.spendCents;
  if (a.firstOrderAt !== b.firstOrderAt) return a.firstOrderAt < b.firstOrderAt ? -1 : 1;
  return a.customerId < b.customerId ? -1 : a.customerId > b.customerId ? 1 : 0;
}

function summarize(orders, limit = 10) {
  const seen = new Set();
  const groups = new Map();
  for (const order of orders) {
    // Upstream retries can deliver the same order twice; the first delivery wins.
    if (seen.has(order.id)) continue;
    seen.add(order.id);
    if (order.status === 'refunded') continue;

    let group = groups.get(order.customerId);
    if (!group) {
      group = { customerId: order.customerId, spendCents: 0, orderCount: 0, firstOrderAt: order.createdAt };
      groups.set(order.customerId, group);
    }
    group.orderCount++;
    if (order.createdAt < group.firstOrderAt) group.firstOrderAt = order.createdAt;
    if (order.status === 'paid') {
      group.spendCents += order.currency === 'EUR' ? Math.round(order.amountCents * EUR_TO_USD) : order.amountCents;
    }
  }
  // byRank is a total order (customer ids are unique), so one final sort matches the running sort.
  return [...groups.values()]
    .sort(byRank)
    .filter((g) => g.spendCents > 0)
    .slice(0, limit)
    .map((g, i) => ({ rank: i + 1, ...g }));
}

module.exports = { summarize };
