'use strict';

function required(obj, fields) {
  for (const f of fields) {
    if (obj == null || obj[f] === undefined || obj[f] === null || obj[f] === '') throw new Error(`Missing field: ${f}`);
  }
  return obj;
}

function positive(n, name) {
  if (!(typeof n === 'number' && n > 0)) throw new Error(`${name} must be a positive number`);
  return n;
}

function oneOf(value, allowed, name) {
  if (!allowed.includes(value)) throw new Error(`${name} must be one of ${allowed.join(', ')}`);
  return value;
}

module.exports = { required, positive, oneOf };
