const assert = require('assert');
const fs = require('fs');

module.exports = (dir) => {
  const { satisfies } = require(`${dir}/src/semver`);
  const yes = (v, r) => assert.strictEqual(satisfies(v, r), true, `${v} should satisfy ${r}`);
  const no = (v, r) => assert.strictEqual(satisfies(v, r), false, `${v} should not satisfy ${r}`);
  return {
    'plain comparators': () => {
      yes('1.2.3', '1.2.3'); yes('1.2.3', '=1.2.3'); yes('2.0.0', '>1.2.3'); no('1.2.3', '>1.2.3');
      yes('1.2.3', '>=1.2.3'); yes('1.2.2', '<1.2.3'); yes('1.2.3', '<=1.2.3'); no('1.2.4', '<=1.2.3');
      yes('1.2.3', '>= 1.2.3'); yes('v1.2.3', '1.2.3'); yes(' 1.2.3 ', '1.2.3');
    },
    'AND within a set, OR across sets': () => {
      yes('1.5.0', '>=1.2.0 <2.0.0'); no('2.0.0', '>=1.2.0 <2.0.0');
      yes('3.1.0', '1.x || >=3.0.0'); yes('1.9.9', '1.x || >=3.0.0'); no('2.5.0', '1.x || >=3.0.0');
    },
    'x-ranges and wildcards': () => {
      yes('7.3.1', '*'); yes('7.3.1', ''); yes('1.9.9', '1'); no('2.0.0', '1.x'); yes('1.2.9', '1.2.*'); no('1.3.0', '1.2');
      yes('1.0.0', 'X');
    },
    'operators with partial versions': () => {
      yes('2.0.0', '>1'); no('1.9.9', '>1'); yes('1.3.0', '>1.2'); no('1.2.9', '>1.2');
      yes('1.9.9', '<=1'); no('2.0.0', '<=1'); yes('1.2.9', '<=1.2'); no('1.3.0', '<=1.2');
      no('1.0.0', '<1'); yes('0.9.9', '<1'); yes('1.1.9', '<1.2'); yes('1.5.0', '=1');
    },
    'tilde': () => {
      yes('1.2.9', '~1.2.3'); no('1.3.0', '~1.2.3'); no('1.2.2', '~1.2.3'); yes('1.2.0', '~1.2'); yes('1.9.0', '~1'); no('2.0.0', '~1');
      yes('1.2.3-beta.4', '~1.2.3-beta.2'); yes('1.2.5', '~1.2.3-beta.2');
    },
    'caret above zero': () => {
      yes('1.9.9', '^1.2.3'); no('2.0.0', '^1.2.3'); no('1.2.2', '^1.2.3'); yes('1.2.0', '^1.2'); yes('1.0.0', '^1'); no('2.0.0', '^1');
      yes('1.2.3-beta.4', '^1.2.3-beta.2'); yes('1.8.0', '^1.2.3-beta.2');
    },
    'caret at zero': () => {
      yes('0.2.9', '^0.2.3'); no('0.3.0', '^0.2.3'); yes('0.0.3', '^0.0.3'); no('0.0.4', '^0.0.3');
      yes('0.2.5', '^0.2'); no('0.3.0', '^0.2'); yes('0.0.9', '^0.0'); no('0.1.0', '^0.0'); yes('0.9.0', '^0'); no('1.0.0', '^0.x');
    },
    'hyphen ranges': () => {
      yes('2.3.4', '1.2.3 - 2.3.4'); no('2.3.5', '1.2.3 - 2.3.4'); yes('1.2.0', '1.2 - 2.3.4'); no('1.1.9', '1.2 - 2.3.4');
      yes('2.3.9', '1.2.3 - 2.3'); no('2.4.0', '1.2.3 - 2.3'); yes('2.9.9', '1.2.3 - 2'); no('3.0.0', '1.2.3 - 2');
    },
    'prerelease ordering': () => {
      yes('1.0.0-alpha.1', '>1.0.0-alpha'); yes('1.0.0-alpha.beta', '>1.0.0-alpha.1'); yes('1.0.0-beta.11', '>1.0.0-beta.2');
      yes('1.0.0-rc.1', '>1.0.0-beta.11'); yes('1.0.0', '>1.0.0-rc.1'); no('1.0.0-rc.1', '>=1.0.0');
    },
    'prerelease needs a comparator on the same tuple': () => {
      yes('1.2.3-alpha.7', '>1.2.3-alpha.3'); no('3.4.5-alpha.9', '>1.2.3-alpha.3'); no('1.2.4-beta', '^1.2.3');
      no('1.0.0-beta', '*'); no('2.0.0-rc.1', '1.x || 2.x'); yes('2.0.0-rc.2', '1.x || >=2.0.0-rc.1');
    },
    'build metadata ignored': () => {
      yes('1.2.3+build.5', '1.2.3'); yes('1.2.3+exp.sha', '>=1.2.3 <1.2.4'); yes('1.2.3', '=1.2.3+other');
    },
    'invalid input returns false': () => {
      no('1.2', '1.2.x'); no('01.2.3', '*'); no('abc', '*'); no('1.2.3', '>=foo'); no('1.2.3', '~>1.2'); no(null, '*');
    },
    'tests were added': () => {
      const src = fs.readdirSync(`${dir}/test`).filter((f) => f.endsWith('.test.js'))
        .map((f) => fs.readFileSync(`${dir}/test/${f}`, 'utf8')).join('\n');
      assert.ok(/satisfies/.test(src), 'no test mentions satisfies');
    },
  };
};
