const assert = require('assert');
const { capitalize } = require('../src/strings');

test('capitalize first letter', () => assert.strictEqual(capitalize('hello'), 'Hello'));
test('capitalize empty string', () => assert.strictEqual(capitalize(''), ''));
