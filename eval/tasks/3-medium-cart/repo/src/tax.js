function applyTax(amount, rate) {
  return amount * (1 + rate);
}

module.exports = { applyTax };
