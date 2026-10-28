const assert = require('assert');
const { range } = require('../src/range');

test('range includes both ends', () => assert.deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5]));
test('range with a step', () => assert.deepStrictEqual(range(0, 6, 3), [0, 3, 6]));
