// Tiny router: handle({ method, path, body }) -> { status, body }.
function createApi(store) {
  return function handle({ method, path, body = {} }) {
    const stockMatch = path.match(/^\/stock\/([^/]+)$/);
    if (method === 'GET' && stockMatch) {
      const sku = decodeURIComponent(stockMatch[1]);
      return { status: 200, body: { sku, stock: store.getStock(sku) } };
    }
    if (method === 'POST' && path === '/stock') {
      try {
        store.addItem(body.sku, body.qty);
        return { status: 201, body: { sku: body.sku, stock: store.getStock(body.sku) } };
      } catch (e) {
        return { status: 400, body: { error: e.message } };
      }
    }
    return { status: 404, body: { error: 'NOT_FOUND' } };
  };
}

module.exports = { createApi };
