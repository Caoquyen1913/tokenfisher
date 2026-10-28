const assert = require('assert');

test('spec exists', () => assert.ok(require('fs').existsSync(`${__dirname}/../docs/SPEC.md`)));
