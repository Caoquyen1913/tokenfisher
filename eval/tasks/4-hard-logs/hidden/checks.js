const assert = require('assert');
const fs = require('fs');

module.exports = (dir) => {
  const { parseAmount } = require(`${dir}/src/money`);
  const { checkout } = require(`${dir}/src/checkout`);
  return {
    'thousands separator': () => assert.strictEqual(parseAmount('1,299.00'), 129900),
    'several separators': () => assert.strictEqual(parseAmount('1,234,567.89'), 123456789),
    'one decimal digit': () => assert.strictEqual(parseAmount('12.5'), 1250),
    'cents only': () => assert.strictEqual(parseAmount('0.99'), 99),
    'surrounding spaces': () => assert.strictEqual(parseAmount(' 42 '), 4200),
    'garbage throws Invalid amount': () => assert.throws(() => parseAmount('abc'), /Invalid amount/),
    'empty throws Invalid amount': () => assert.throws(() => parseAmount(''), /Invalid amount/),
    'checkout with big price': () => assert.deepStrictEqual(
      checkout({ id: 'o9', items: [{ sku: 'P-1', price: '2,450.50', qty: 2 }] }), { orderId: 'o9', totalCents: 490100 }),
    'regression test added': () => {
      const src = fs.readdirSync(`${dir}/test`).filter((f) => f.endsWith('.test.js'))
        .map((f) => fs.readFileSync(`${dir}/test/${f}`, 'utf8')).join('\n');
      assert.ok(/\d,\d{3}/.test(src), 'no test uses an amount with a thousands separator');
    },
  };
};
