// Deterministic order generator that exercises every quirk of the original report:
// duplicate ids with different payloads, mixed-case customer ids, EUR rounding,
// statuses beyond paid/pending/refunded, equal spends and equal first-order times.
function generate(n, seed, customers = Math.max(20, Math.floor(n / 40))) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
  const letters = 'aAbBcCdD';
  const ids = Array.from({ length: customers }, (_, i) => `cus_${letters[i % 8]}${letters[(i >> 3) % 8]}${Math.floor(i / 64)}`);
  const statuses = ['paid', 'paid', 'paid', 'pending', 'refunded', 'failed'];
  const amounts = [500, 999, 1000, 1250, 4999, 12345];
  const orders = [];
  for (let i = 0; i < n; i++) {
    const dup = i > 10 && rnd() < 0.05;
    const base = dup ? orders[Math.floor(rnd() * orders.length)] : null;
    orders.push({
      id: base ? base.id : `ord_${i}`,
      customerId: pick(ids),
      status: pick(statuses),
      amountCents: pick(amounts),
      currency: rnd() < 0.3 ? 'EUR' : 'USD',
      createdAt: new Date(Date.UTC(2026, 9, 1) + Math.floor(rnd() * 400) * 60000).toISOString(),
    });
  }
  return orders;
}

module.exports = { generate };
