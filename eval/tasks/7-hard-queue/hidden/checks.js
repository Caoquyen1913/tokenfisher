const assert = require('assert');
const fs = require('fs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A job that tracks how many jobs run at once.
function tracker() {
  const t = { now: 0, max: 0, started: [] };
  t.job = (id, ms = 10, fail = false) => async () => {
    t.started.push(id);
    t.now++;
    t.max = Math.max(t.max, t.now);
    await sleep(ms);
    t.now--;
    if (fail) throw new Error(`job ${id} failed`);
    return id;
  };
  return t;
}

module.exports = (dir) => {
  const { createQueue } = require(`${dir}/src/queue`);
  return {
    'never exceeds concurrency, uses all slots': async () => {
      const q = createQueue({ concurrency: 3 });
      const t = tracker();
      await Promise.all(Array.from({ length: 10 }, (_, i) => q.add(t.job(i, 15))));
      assert.strictEqual(t.max, 3);
    },
    'starts jobs in FIFO order': async () => {
      const q = createQueue({ concurrency: 2 });
      const t = tracker();
      await Promise.all(Array.from({ length: 8 }, (_, i) => q.add(t.job(i, (8 - i) * 3))));
      assert.deepStrictEqual(t.started, [0, 1, 2, 3, 4, 5, 6, 7]);
    },
    'a failed job rejects its own promise': async () => {
      const q = createQueue();
      await assert.rejects(q.add(async () => { throw new Error('boom'); }), /boom/);
    },
    'keeps going after a failure': async () => {
      const q = createQueue({ concurrency: 1 });
      const t = tracker();
      const a = q.add(t.job('a', 5, true)).catch((e) => e.message);
      const b = q.add(t.job('b', 5));
      assert.deepStrictEqual(await Promise.all([a, b]), ['job a failed', 'b']);
    },
    'many failures do not leak slots': async () => {
      const q = createQueue({ concurrency: 2 });
      const t = tracker();
      const jobs = Array.from({ length: 6 }, (_, i) => q.add(t.job(i, 5, i < 4)).catch(() => 'x'));
      assert.deepStrictEqual(await Promise.all(jobs), ['x', 'x', 'x', 'x', 4, 5]);
      assert.strictEqual(q.running, 0);
    },
    'synchronous throw and plain values': async () => {
      const q = createQueue({ concurrency: 1 });
      const thrown = q.add(() => { throw new Error('sync'); });
      const plain = q.add(() => 42);
      await assert.rejects(thrown, /sync/);
      assert.strictEqual(await plain, 42);
    },
    'onIdle waits for running jobs': async () => {
      const q = createQueue({ concurrency: 2 });
      let done = 0;
      q.add(async () => { await sleep(10); done++; });
      q.add(async () => { await sleep(40); done++; });
      await sleep(20); // first job finished, second still running, nothing pending
      await q.onIdle();
      assert.strictEqual(done, 2);
    },
    'onIdle resolves at once when idle': async () => {
      const q = createQueue();
      await q.onIdle();
      await q.add(async () => 1);
      await q.onIdle();
    },
    'onIdle after failures': async () => {
      const q = createQueue({ concurrency: 1 });
      q.add(async () => { await sleep(5); throw new Error('x'); }).catch(() => {});
      q.add(async () => { await sleep(5); }).catch(() => {});
      await q.onIdle();
      assert.strictEqual(q.pending + q.running, 0);
    },
    'pause holds new starts, resume fills every slot': async () => {
      const q = createQueue({ concurrency: 4 });
      q.pause();
      const t = tracker();
      const all = Array.from({ length: 8 }, (_, i) => q.add(t.job(i, 20)));
      await sleep(10);
      assert.strictEqual(t.started.length, 0);
      assert.strictEqual(q.pending, 8);
      q.resume();
      await sleep(5);
      assert.strictEqual(q.running, 4);
      await Promise.all(all);
      assert.strictEqual(t.max, 4);
    },
    'pause lets running jobs finish': async () => {
      const q = createQueue({ concurrency: 1 });
      const t = tracker();
      const first = q.add(t.job('a', 15));
      q.add(t.job('b', 1));
      await sleep(2);
      q.pause();
      assert.strictEqual(await first, 'a');
      await sleep(10);
      assert.deepStrictEqual(t.started, ['a']);
      q.resume();
      await q.onIdle();
      assert.deepStrictEqual(t.started, ['a', 'b']);
    },
    'regression tests added': () => {
      const src = fs.readdirSync(`${dir}/test`).filter((f) => f.endsWith('.test.js'))
        .map((f) => fs.readFileSync(`${dir}/test/${f}`, 'utf8')).join('\n');
      assert.ok(/onIdle/.test(src) && /(reject|throw|fail)/i.test(src) && /resume/.test(src), 'missing regression tests for failure, onIdle or resume');
    },
  };
};
