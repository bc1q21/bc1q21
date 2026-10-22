import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRegtestReadOnlyRpc } from './local-regtest-readonly-transport.mjs';

const AUTH = 'Basic ' + Buffer.from('localtest:temporary').toString('base64');

async function withServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await fn(server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('authenticated loopback RPC reads permitted public method', async () => {
  await withServer((req, res) => {
    assert.equal(req.headers.authorization, AUTH);
    assert.equal(req.method, 'POST');
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      assert.equal(JSON.parse(body).method, 'getbestblockhash');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ result: 'a'.repeat(64), error: null }));
    });
  }, async port => {
    const rpc = createRegtestReadOnlyRpc({ port, authorization: AUTH });
    assert.equal(await rpc('getbestblockhash', []), 'a'.repeat(64));
  });
});

test('rejects invalid authentication without leaking response', async () => {
  await withServer((req, res) => {
    res.writeHead(req.headers.authorization === AUTH ? 200 : 401);
    res.end('unauthorized');
  }, async port => {
    const rpc = createRegtestReadOnlyRpc({ port, authorization: 'Basic invalid' });
    await assert.rejects(rpc('getblockchaininfo'), /rejected/);
  });
});

test('rejects all signing, wallet, mining and broadcast methods before request', async () => {
  const rpc = createRegtestReadOnlyRpc({ authorization: AUTH });
  for (const method of ['sendrawtransaction', 'signrawtransactionwithwallet', 'walletpassphrase', 'getnewaddress', 'generatetoaddress', 'testmempoolaccept']) {
    await assert.rejects(rpc(method), /not allowed/);
  }
});

test('rejects absent credentials and malformed response', async () => {
  assert.throws(() => createRegtestReadOnlyRpc(), /authentication required/);
  await withServer((req, res) => { res.writeHead(200); res.end('not json'); }, async port => {
    const rpc = createRegtestReadOnlyRpc({ port, authorization: AUTH });
    await assert.rejects(rpc('getblockchaininfo'), /Invalid RPC response/);
  });
});
