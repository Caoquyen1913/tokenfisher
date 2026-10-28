// In-memory inventory. `clock` is injectable so tests can control time.
function createStore({ clock = Date.now } = {}) {
  const stock = new Map();

  function assertQty(qty) {
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('INVALID_QTY');
  }

  return {
    clock,
    addItem(sku, qty) {
      assertQty(qty);
      stock.set(sku, (stock.get(sku) || 0) + qty);
    },
    removeItem(sku, qty) {
      assertQty(qty);
      const current = stock.get(sku) || 0;
      if (qty > current) throw new Error('INSUFFICIENT_STOCK');
      stock.set(sku, current - qty);
    },
    getStock(sku) {
      return stock.get(sku) || 0;
    },
  };
}

module.exports = { createStore };
