const assert = require('assert');
const { createQueue } = require('../src/queue');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('runs jobs and returns their results', async () => {
  const q = createQueue({ concurrency: 2 });
  const results = await Promise.all([1, 2, 3].map((n) => q.add(async () => { await sleep(5); return n * 10; })));
  assert.deepStrictEqual(results, [10, 20, 30]);
});

test('starts jobs in order with concurrency 1', async () => {
  const q = createQueue();
  const order = [];
  await Promise.all(['a', 'b', 'c'].map((x) => q.add(async () => { order.push(x); await sleep(1); })));
  assert.deepStrictEqual(order, ['a', 'b', 'c']);
});
