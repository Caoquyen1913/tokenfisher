// The original implementation, kept verbatim as the behavioral oracle.
const EUR_TO_USD = 1.08;

function byRank(a, b) {
  if (a.spendCents !== b.spendCents) return b.spendCents - a.spendCents;
  if (a.firstOrderAt !== b.firstOrderAt) return a.firstOrderAt < b.firstOrderAt ? -1 : 1;
  return a.customerId < b.customerId ? -1 : a.customerId > b.customerId ? 1 : 0;
}

function summarize(orders, limit = 10) {
  const seen = [];
  const groups = [];
  for (const order of orders) {
    if (seen.includes(order.id)) continue;
    seen.push(order.id);
    if (order.status === 'refunded') continue;
    let group = groups.find((g) => g.customerId === order.customerId);
    if (!group) {
      group = { customerId: order.customerId, spendCents: 0, orderCount: 0, firstOrderAt: order.createdAt };
      groups.push(group);
    }
    group.orderCount++;
    if (order.createdAt < group.firstOrderAt) group.firstOrderAt = order.createdAt;
    if (order.status === 'paid') {
      group.spendCents += order.currency === 'EUR' ? Math.round(order.amountCents * EUR_TO_USD) : order.amountCents;
    }
    groups.sort(byRank);
  }
  return groups
    .filter((g) => g.spendCents > 0)
    .slice(0, limit)
    .map((g, i) => ({ rank: i + 1, ...g }));
}

module.exports = { summarize };
