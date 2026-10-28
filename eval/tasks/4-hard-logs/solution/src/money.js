// Parses a user-entered amount such as "12.50" or "1,299.00" into integer cents.
// Throws Error('Invalid amount: <input>') for input that is not an amount.
function parseAmount(input) {
  const m = String(input).trim().match(/^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/);
  if (!m) throw new Error(`Invalid amount: ${input}`);
  const whole = Number(m[1].replace(/,/g, ''));
  const frac = m[2] ? Number(m[2].padEnd(2, '0')) : 0;
  return whole * 100 + frac;
}

function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

module.exports = { parseAmount, formatCents };
