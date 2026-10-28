const assert = require('assert');
const { parseAmount } = require('../src/money');

test('parses thousands separators (checkout 500 regression)', () => assert.strictEqual(parseAmount('1,299.00'), 129900));
test('rejects garbage with Invalid amount', () => assert.throws(() => parseAmount('abc'), /Invalid amount/));
