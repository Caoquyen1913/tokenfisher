// Parses a user-entered amount such as "12.50" into integer cents.
// Throws Error('Invalid amount: <input>') for input that is not an amount.
function parseAmount(input) {
  const m = String(input).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  const whole = Number(m[1]);
  const frac = m[2] ? Number(m[2].padEnd(2, '0')) : 0;
  return whole * 100 + frac;
}

function formatCents(cents) {
  return (cents / 100).toFixed(2);
}

module.exports = { parseAmount, formatCents };
