const { checkout } = require('./checkout');
const { slowQueryWarning } = require('./db');

function log(level, msg) {
  console.log(`${new Date().toISOString()} ${level} ${msg}`);
}

function handle(req) {
  if (req.method === 'POST' && req.path === '/checkout') {
    log('DEBUG', `checkout payload items=${JSON.stringify(req.body.items)}`);
    try {
      const result = checkout(req.body);
      log('INFO', `POST /checkout 200 order=${req.body.id} total=${result.totalCents}`);
      return { status: 200, body: result };
    } catch (e) {
      log('ERROR', `POST /checkout 500 order=${req.body.id} ${e.stack}`);
      return { status: 500, body: { error: 'INTERNAL' } };
    }
  }
  slowQueryWarning(req.path);
  return { status: 404, body: { error: 'NOT_FOUND' } };
}

module.exports = { handle };
