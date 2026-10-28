const assert = require('assert');

module.exports = (dir) => {
  const { range } = require(`${dir}/src/range`);
  return {
    'range(1, 5)': () => assert.deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5]),
    'single element range(0, 0)': () => assert.deepStrictEqual(range(0, 0), [0]),
    'step lands on end range(2, 10, 2)': () => assert.deepStrictEqual(range(2, 10, 2), [2, 4, 6, 8, 10]),
    'step skips end range(1, 6, 2)': () => assert.deepStrictEqual(range(1, 6, 2), [1, 3, 5]),
    'negative numbers range(-2, 1)': () => assert.deepStrictEqual(range(-2, 1), [-2, -1, 0, 1]),
  };
};
