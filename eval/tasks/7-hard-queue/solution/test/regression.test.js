const assert = require('assert');
const { createQueue } = require('../src/queue');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('keeps going after a job fails', async () => {
  const q = createQueue();
  await assert.rejects(q.add(async () => { throw new Error('x'); }));
  assert.strictEqual(await q.add(async () => 1), 1);
});

test('onIdle waits for running jobs; resume fills every slot', async () => {
  const q = createQueue({ concurrency: 2 });
  q.pause();
  q.add(() => sleep(10));
  q.add(() => sleep(10));
  q.resume();
  assert.strictEqual(q.running, 2);
  await q.onIdle();
  assert.strictEqual(q.running, 0);
});
