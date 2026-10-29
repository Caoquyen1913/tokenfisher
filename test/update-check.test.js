'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const { newer } = require('../bin/update-check');

const HOOK = path.join(__dirname, '..', 'bin', 'update-check.js');

function run(env) {
  return new Promise((resolve) => {
    execFile('node', [HOOK], { env: { ...process.env, ...env } }, (err, stdout) => resolve(stdout));
  });
}

test('version compare', () => {
  assert.equal(newer('0.3.0', '0.2.0'), true);
  assert.equal(newer('0.10.0', '0.9.9'), true);
  assert.equal(newer('1.0.0', '1.0.0'), false);
  assert.equal(newer('0.2.9', '0.3.0'), false);
});

test('tells the user once a day when GitHub has a newer version, silent otherwise', async () => {
  let hits = 0;
  let version = '99.0.0';
  const server = http.createServer((req, res) => { hits++; res.end(JSON.stringify({ version })); });
  await new Promise((r) => server.listen(0, r));
  const env = {
    TOKENFISHER_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'update-check-')),
    TOKENFISHER_UPDATE_URL: `http://127.0.0.1:${server.address().port}/plugin.json`,
  };
  try {
    assert.match(JSON.parse(await run(env)).systemMessage, /^tokenfisher 99\.0\.0 is out \(you have [\d.]+\)/);
    assert.equal(await run(env), ''); // checked within the last day: no request, no message
    assert.equal(hits, 1);

    fs.rmSync(path.join(env.TOKENFISHER_HOME, 'update.json'));
    version = '0.0.1';
    assert.equal(await run(env), ''); // older on GitHub: nothing to say
    assert.equal(await run({ ...env, TOKENFISHER_NO_UPDATE_CHECK: '1', TOKENFISHER_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'update-check-')) }), '');
    assert.equal(hits, 2);
  } finally {
    server.close();
  }
});

test('an unreachable server stays silent', async () => {
  const out = await run({
    TOKENFISHER_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'update-check-')),
    TOKENFISHER_UPDATE_URL: 'http://127.0.0.1:9/plugin.json',
  });
  assert.equal(out, '');
});
