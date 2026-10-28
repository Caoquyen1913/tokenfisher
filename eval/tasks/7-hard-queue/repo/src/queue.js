// Promise job queue.
//
// Contract:
// - add(fn) queues a job; fn may return a promise, a plain value, or throw.
//   add() returns a promise that settles with the job's outcome.
// - At most `concurrency` jobs run at the same time; jobs start in the order they were added.
// - A failing job rejects its own promise only; the queue keeps going.
// - onIdle() resolves once nothing is pending and nothing is running (immediately if already idle).
// - pause() stops starting new jobs (running ones finish); resume() starts as many as there are free slots.
// - `pending` and `running` report the current counts.
function createQueue({ concurrency = 1 } = {}) {
  const pending = [];
  let running = 0;
  let paused = false;
  let idleWaiters = [];

  function next() {
    if (paused || running >= concurrency || pending.length === 0) return;
    const { fn, resolve, reject } = pending.shift();
    running++;
    fn().then((value) => {
      running--;
      resolve(value);
      next();
      checkIdle();
    }, reject);
  }

  function checkIdle() {
    if (pending.length === 0) {
      idleWaiters.forEach((wake) => wake());
      idleWaiters = [];
    }
  }

  return {
    add(fn) {
      return new Promise((resolve, reject) => {
        pending.push({ fn, resolve, reject });
        next();
      });
    },
    onIdle() {
      return new Promise((resolve) => {
        idleWaiters.push(resolve);
        checkIdle();
      });
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      next();
    },
    get pending() {
      return pending.length;
    },
    get running() {
      return running;
    },
  };
}

module.exports = { createQueue };
