// Tiny router: handle({ method, path, body }) -> { status, body }.
const STATUS = { INVALID_QTY: 400, INSUFFICIENT_STOCK: 409, RESERVATION_NOT_FOUND: 404, RESERVATION_EXPIRED: 410 };

function createApi(store) {
  const fail = (e) => ({ status: STATUS[e.message] || 500, body: { error: e.message } });
  return function handle({ method, path, body = {} }) {
    const stockMatch = path.match(/^\/stock\/([^/]+)$/);
    if (method === 'GET' && stockMatch) {
      const sku = decodeURIComponent(stockMatch[1]);
      return { status: 200, body: { sku, stock: store.getStock(sku), available: store.getAvailable(sku) } };
    }
    if (method === 'POST' && path === '/stock') {
      try {
        store.addItem(body.sku, body.qty);
        return { status: 201, body: { sku: body.sku, stock: store.getStock(body.sku) } };
      } catch (e) {
        return { status: 400, body: { error: e.message } };
      }
    }
    if (method === 'POST' && path === '/reservations') {
      try {
        return { status: 201, body: { id: store.reserve(body.sku, body.qty, body.ttlMs) } };
      } catch (e) { return fail(e); }
    }
    const confirmMatch = path.match(/^\/reservations\/([^/]+)\/confirm$/);
    if (method === 'POST' && confirmMatch) {
      try {
        return { status: 200, body: store.confirm(decodeURIComponent(confirmMatch[1])) };
      } catch (e) { return fail(e); }
    }
    const resMatch = path.match(/^\/reservations\/([^/]+)$/);
    if (method === 'DELETE' && resMatch) {
      store.release(decodeURIComponent(resMatch[1]));
      return { status: 204, body: null };
    }
    return { status: 404, body: { error: 'NOT_FOUND' } };
  };
}

module.exports = { createApi };
