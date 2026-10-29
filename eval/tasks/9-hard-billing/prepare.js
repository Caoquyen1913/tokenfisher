// Fills <workdir>/src with ~75 deterministic modules around the hand-written billing core,
// so finding the bug takes real exploration. None of these files holds the bug.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];

const DOMAINS = [
  ['customers', 'customer', ['email', 'country']],
  ['catalog', 'product', ['sku', 'name']],
  ['subscriptions', 'subscription', ['customerId', 'planId']],
  ['notifications', 'notification', ['customerId', 'template']],
  ['audit', 'auditEntry', ['type', 'actor']],
  ['auth', 'apiKey', ['ownerId', 'scope']],
  ['jobs', 'job', ['name', 'runAt']],
  ['refunds', 'refund', ['invoiceId', 'reason']],
  ['payouts', 'payout', ['accountId', 'period']],
  ['coupons', 'coupon', ['code', 'percentOff']],
  ['dunning', 'dunningCase', ['invoiceId', 'stage']],
  ['plans', 'plan', ['name', 'interval']],
  ['integrations/erp', 'erpSync', ['entity', 'externalId']],
  ['integrations/crm', 'crmContact', ['customerId', 'externalId']],
  ['integrations/tax-provider', 'taxQuote', ['country', 'postalCode']],
];

// Domains that move money compute minor units the same way invoices do, from the stored upper-case code.
const MONEY = {
  refunds: ['calc', 'refundMinor', 'amount'],
  payouts: ['batch', 'payoutMinor', 'net'],
  subscriptions: ['proration', 'prorationMinor', 'unusedAmount'],
  coupons: ['apply', 'discountMinor', 'discount'],
  dunning: ['late-fee', 'lateFeeMinor', 'fee'],
};

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const rel = (from, to) => {
  const r = path.relative(path.dirname(from), to).replace(/\\/g, '/');
  return r.startsWith('.') ? r : `./${r}`;
};

const files = {};
for (const [domain, entity, fields] of DOMAINS) {
  const base = `src/${domain}`;
  const lib = (f, name) => rel(`${base}/${f}.js`, `src/lib/${name}`);
  const E = cap(entity);

  files[`${base}/store.js`] = `'use strict';

// In-memory ${entity} store; production swaps in the Postgres adapter with the same methods.
function createStore() {
  const rows = new Map();
  let seq = 0;
  return {
    async insert(row) { const id = \`${entity.slice(0, 3)}_\${++seq}\`; rows.set(id, { ...row, id }); return rows.get(id); },
    async get(id) { return rows.get(id) || null; },
    async update(id, patch) { if (!rows.has(id)) return null; rows.set(id, { ...rows.get(id), ...patch }); return rows.get(id); },
    async list(filter = {}) { return [...rows.values()].filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v)); },
    async remove(id) { return rows.delete(id); },
  };
}

module.exports = { createStore };
`;

  files[`${base}/validators.js`] = `'use strict';

const { required } = require('${lib('validators', 'validation')}');

function validate${E}(input) {
  return required(input, ${JSON.stringify(fields)});
}

module.exports = { validate${E} };
`;

  files[`${base}/events.js`] = `'use strict';

const log = require('${lib('events', 'log')}');

const listeners = [];

function on${E}Changed(fn) { listeners.push(fn); }

async function emit${E}Changed(${entity}, change) {
  log.debug('${entity} changed', { id: ${entity}.id, change });
  for (const fn of listeners) await fn(${entity}, change);
}

module.exports = { on${E}Changed, emit${E}Changed };
`;

  files[`${base}/service.js`] = `'use strict';

const { validate${E} } = require('./validators');
const { emit${E}Changed } = require('./events');

function create${E}Service({ store }) {
  return {
    async create(input) {
      const row = await store.insert(validate${E}(input));
      await emit${E}Changed(row, 'created');
      return row;
    },
    async update(id, patch) {
      const row = await store.update(id, patch);
      if (!row) throw new Error('${entity} not found: ' + id);
      await emit${E}Changed(row, 'updated');
      return row;
    },
    get: (id) => store.get(id),
    list: (filter) => store.list(filter),
  };
}

module.exports = { create${E}Service };
`;

  files[`${base}/index.js`] = `'use strict';

module.exports = {
  ...require('./service'),
  ...require('./store'),
  ...require('./events'),${MONEY[domain] ? `\n  ...require('./${MONEY[domain][0]}'),` : ''}
};
`;

  if (MONEY[domain]) {
    const [file, fn, field] = MONEY[domain];
    files[`${base}/${file}.js`] = `'use strict';

const { toMinor } = require('${lib(file, 'money/minor')}');

// ${E} amount in minor units, for the ledger and the gateway. record.currency is the stored ISO code.
function ${fn}(record) {
  if (record.${field} < 0) throw new Error('${field} must not be negative');
  return toMinor(record.${field}, record.currency);
}

module.exports = { ${fn} };
`;
  }

  if (domain.startsWith('integrations/')) {
    const system = domain.split('/')[1];
    files[`${base}/client.js`] = `'use strict';

const { toGatewayCurrency } = require('${lib('client', 'currency/normalize')}');
const log = require('${lib('client', 'log')}');

// ${system} API client. Their API, like the card gateway, takes lower-case currency codes.
function create${cap(system.replace(/-(\w)/g, (_, c) => c.toUpperCase()))}Client({ http }) {
  return {
    async push(record) {
      const body = { ...record, currency: record.currency && toGatewayCurrency(record.currency) };
      log.debug('${system} push', { id: record.id });
      return http.post('/${entity}s', body);
    },
    async fetch(externalId) {
      return http.get('/${entity}s/' + encodeURIComponent(externalId));
    },
  };
}

module.exports = { create${cap(system.replace(/-(\w)/g, (_, c) => c.toUpperCase()))}Client };
`;
  }
}

for (const [domain, entity] of DOMAINS.filter(([d]) => !d.startsWith('integrations/'))) {
  const route = `src/api/routes/${domain}.js`;
  files[route] = `'use strict';

const { create${cap(entity)}Service, createStore } = require('${rel(route, `src/${domain}`)}');

const service = create${cap(entity)}Service({ store: createStore() });

module.exports = [
  { method: 'GET', path: '/${domain}', handler: (req) => service.list(req.query) },
  { method: 'GET', path: '/${domain}/:id', handler: (req) => service.get(req.params.id) },
  { method: 'POST', path: '/${domain}', handler: (req) => service.create(req.body) },
  { method: 'PATCH', path: '/${domain}/:id', handler: (req) => service.update(req.params.id, req.body) },
];
`;
}

for (const [rel_, text] of Object.entries(files)) {
  const p = path.join(dir, rel_);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}
