'use strict';

const https = require('https');
const log = require('../../lib/log');

// Thin client for the card gateway. Tests pass a fake with the same createCharge().
function createClient({ host = 'api.cardgateway.example', apiKey } = {}) {
  function post(pathname, body, idempotencyKey) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = https.request({
        host,
        path: pathname,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'idempotency-key': idempotencyKey,
        },
      }, (res) => {
        let raw = '';
        res.on('data', (d) => { raw += d; });
        res.on('end', () => {
          const parsed = raw ? JSON.parse(raw) : {};
          if (res.statusCode >= 400) return reject(new Error(`gateway ${res.statusCode}: ${parsed.error || raw}`));
          resolve(parsed);
        });
      });
      req.on('error', reject);
      req.end(data);
    });
  }

  return {
    async createCharge(payload) {
      log.info('gateway charge', { amount: payload.amount, currency: payload.currency });
      const { idempotency_key: key, ...body } = payload;
      return post('/v1/charges', body, key);
    },
  };
}

module.exports = { createClient };
