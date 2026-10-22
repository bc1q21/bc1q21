// Professional-only, Node.js-only, regtest read-only RPC transport.
// This component cannot sign, broadcast, or access a wallet.
import http from 'node:http';
import assert from 'node:assert/strict';

const allowed = new Set(['getbestblockhash', 'getblockchaininfo', 'getblockheader', 'getrawtransaction', 'gettxout']);

export function createRegtestReadOnlyRpc({ port = 18443, authorization, timeoutMs = 5000 } = {}) {
  assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, 'Invalid RPC port');
  assert.ok(typeof authorization === 'string' && authorization.startsWith('Basic ') && authorization.length > 6, 'Local authentication required');
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 10000, 'Invalid timeout');
  return async (method, params = []) => {
    assert.ok(allowed.has(method), 'RPC method not allowed');
    assert.ok(Array.isArray(params), 'RPC params must be an array');
    const payload = JSON.stringify({ jsonrpc: '1.0', id: 'professional-readonly', method, params });
    assert.ok(Buffer.byteLength(payload) <= 8192, 'RPC request too large');
    return new Promise((resolve, reject) => {
      const request = http.request({
        hostname: '127.0.0.1', port, path: '/', method: 'POST', agent: false,
        headers: { authorization, 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
        timeout: timeoutMs
      }, response => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(Error('Local regtest RPC request rejected'));
          return;
        }
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          body += chunk;
          if (Buffer.byteLength(body) > 2000000) request.destroy(Error('RPC response too large'));
        });
        response.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.error || !Object.hasOwn(result, 'result')) throw Error('Invalid RPC result');
            resolve(result.result);
          } catch {
            reject(Error('Invalid RPC response'));
          }
        });
      });
      request.on('timeout', () => request.destroy(Error('RPC timed out')));
      request.on('error', () => reject(Error('Local RPC connection failed')));
      request.end(payload);
    });
  };
}
