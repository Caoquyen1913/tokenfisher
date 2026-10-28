const assert = require('assert');
const fs = require('fs');

module.exports = (dir) => {
  const { slugify, capitalize } = require(`${dir}/src/strings`);
  return {
    'basic words': () => assert.strictEqual(slugify('Hello World'), 'hello-world'),
    'vietnamese diacritics': () => assert.strictEqual(slugify('Xin chào Việt Nam'), 'xin-chao-viet-nam'),
    'đ becomes d': () => assert.strictEqual(slugify('Đường Đi'), 'duong-di'),
    'other latin accents': () => assert.strictEqual(slugify('Crème Brûlée à la mode'), 'creme-brulee-a-la-mode'),
    'punctuation runs collapse': () => assert.strictEqual(slugify('  Hello,   World!!  -- 2026 '), 'hello-world-2026'),
    'empty and symbols only': () => { assert.strictEqual(slugify(''), ''); assert.strictEqual(slugify('!!!'), ''); },
    'max 50 without trailing hyphen': () => {
      const s = slugify('a'.repeat(49) + ' bcd');
      assert.ok(s.length <= 50 && !s.endsWith('-'), s);
      assert.strictEqual(s, 'a'.repeat(49));
    },
    'capitalize untouched': () => assert.strictEqual(capitalize('abc'), 'Abc'),
    'tests were added for slugify': () => {
      const src = fs.readdirSync(`${dir}/test`).filter((f) => f.endsWith('.test.js'))
        .map((f) => fs.readFileSync(`${dir}/test/${f}`, 'utf8')).join('\n');
      assert.ok(/slugify/.test(src), 'no test mentions slugify');
    },
  };
};
