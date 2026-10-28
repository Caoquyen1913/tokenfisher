// In-memory inventory. `clock` is injectable so tests can control time.
function createStore({ clock = Date.now } = {}) {
  const stock = new Map();
  const reservations = new Map(); // id -> { sku, qty, expiresAt }
  let seq = 0;

  function assertQty(qty) {
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('INVALID_QTY');
  }

  function reserved(sku) {
    const now = clock();
    let n = 0;
    for (const r of reservations.values()) if (r.sku === sku && now < r.expiresAt) n += r.qty;
    return n;
  }

  const store = {
    clock,
    addItem(sku, qty) {
      assertQty(qty);
      stock.set(sku, (stock.get(sku) || 0) + qty);
    },
    removeItem(sku, qty) {
      assertQty(qty);
      if (qty > store.getAvailable(sku)) throw new Error('INSUFFICIENT_STOCK');
      stock.set(sku, (stock.get(sku) || 0) - qty);
    },
    getStock(sku) {
      return stock.get(sku) || 0;
    },
    getAvailable(sku) {
      return store.getStock(sku) - reserved(sku);
    },
    reserve(sku, qty, ttlMs) {
      assertQty(qty);
      if (qty > store.getAvailable(sku)) throw new Error('INSUFFICIENT_STOCK');
      const id = `r${++seq}`;
      reservations.set(id, { sku, qty, expiresAt: clock() + ttlMs });
      return id;
    },
    confirm(id) {
      const r = reservations.get(id);
      if (!r) throw new Error('RESERVATION_NOT_FOUND');
      if (clock() >= r.expiresAt) throw new Error('RESERVATION_EXPIRED');
      reservations.delete(id);
      stock.set(r.sku, store.getStock(r.sku) - r.qty);
      return { sku: r.sku, stock: store.getStock(r.sku) };
    },
    release(id) {
      reservations.delete(id);
    },
  };
  return store;
}

module.exports = { createStore };
