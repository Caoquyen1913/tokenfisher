const assert = require('assert');
const { satisfies } = require('../src/semver');

test('caret range', () => assert.strictEqual(satisfies('1.9.0', '^1.2.3'), true));
test('prerelease needs same tuple', () => assert.strictEqual(satisfies('1.2.4-beta', '^1.2.3'), false));
