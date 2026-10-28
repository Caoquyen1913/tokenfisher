const assert = require('assert');
const { slugify } = require('../src/strings');

test('slugify vietnamese', () => assert.strictEqual(slugify('Xin chào Việt Nam'), 'xin-chao-viet-nam'));
