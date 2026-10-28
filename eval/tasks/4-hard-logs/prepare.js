// Writes a deterministic ~5,000-line production log into <workdir>/logs/app.log.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
let seed = 42;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = (xs) => xs[Math.floor(rand() * xs.length)];

const prices = ['12.50', '7', '99.99', '45.00', '3.25', '250.00', '18.90'];
const bigPrices = ['1,299.00', '2,450.50', '1,005.99'];
const lines = [];
let t = Date.parse('2026-10-20T08:00:00Z');
for (let i = 0; i < 4200; i++) {
  t += Math.floor(rand() * 4000);
  const ts = new Date(t).toISOString();
  const r = rand();
  if (r < 0.45) lines.push(`${ts} INFO GET /products/${Math.floor(rand() * 900) + 100} 200 ${Math.floor(rand() * 80) + 5}ms`);
  else if (r < 0.65) lines.push(`${ts} INFO POST /cart 200 ${Math.floor(rand() * 40) + 5}ms`);
  else if (r < 0.70) lines.push(`${ts} WARN slow query on products_search took ${Math.floor(rand() * 900) + 1000}ms`);
  else if (r < 0.72) lines.push(`${ts} WARN upstream payment-gateway retry attempt=${Math.floor(rand() * 3) + 1}`);
  else {
    const order = `ord_${10000 + i}`;
    const failing = rand() < 0.03;
    const items = [{ sku: `P-${Math.floor(rand() * 90) + 10}`, price: failing ? pick(bigPrices) : pick(prices), qty: Math.floor(rand() * 3) + 1 }];
    lines.push(`${ts} DEBUG checkout payload items=${JSON.stringify(items)}`);
    if (failing) {
      lines.push(`${ts} ERROR POST /checkout 500 order=${order} TypeError: Cannot read properties of null (reading '1')`);
      lines.push('    at parseAmount (src/money.js:5:19)');
      lines.push('    at src/checkout.js:5:63');
      lines.push('    at Array.reduce (<anonymous>)');
      lines.push('    at checkout (src/checkout.js:5:35)');
      lines.push('    at handle (src/server.js:12:22)');
    } else {
      lines.push(`${ts} INFO POST /checkout 200 order=${order} total=${Math.floor(rand() * 50000)}`);
    }
  }
}
fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
fs.writeFileSync(path.join(dir, 'logs', 'app.log'), lines.join('\n') + '\n');
