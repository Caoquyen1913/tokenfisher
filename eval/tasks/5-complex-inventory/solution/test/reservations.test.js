const assert = require('assert');
const { createStore } = require('../src/store');

test('reserve then confirm sells stock', () => {
  const s = createStore({ clock: () => 0 });
  s.addItem('A', 5);
  const id = s.reserve('A', 2, 100);
  assert.strictEqual(s.getAvailable('A'), 3);
  s.confirm(id);
  assert.strictEqual(s.getStock('A'), 3);
});
