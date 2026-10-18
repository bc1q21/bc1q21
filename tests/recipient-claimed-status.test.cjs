// Regression test for the Lindsay report: a claimed output must never return to Ready.
// Run: node --test tests/recipient-claimed-status.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../Frontend/gift/gift-h08.js'), 'utf8');
const start = source.indexOf('        async refreshSpentStatuses() {');
const end = source.indexOf('        extractPriceUsd(status) {', start);
assert.ok(start !== -1 && end > start, 'status method must exist');
const method = source.slice(start, end).trim().replace(/,\s*$/, '');
const refresh = new Function('return ({' + method + '}).refreshSpentStatuses')();

function giftRows() {
  return ['a', 'b'].map((letter, i) => ({
    address: '3' + letter, fundingTxid: letter.repeat(64),
    fundingVout: i, sats: 1000 + i, validation: 'match',
    releaseDate: '2026-08-01', spent: false, pending: false,
    checkedSpent: false, ready: false
  }));
}
function page() {
  return {
    rows: giftRows(), utxoCache: new Map(), baseApi: '/bitcoin',
    isReadyForRelease: () => true,
    updateReadyCount() {
      this.rows = this.rows.map(r => ({
        ...r, ready: r.checkedSpent === true && !r.spent && !r.pending
      }));
      this.readyCount = this.rows.filter(r => r.ready).length;
    }
  };
}
async function withResponses(responses, run) {
  const original = global.fetch;
  global.fetch = async url => {
    const key = url.includes('/3a/') ? 'a' : 'b';
    const result = responses[key];
    return {
      ok: result !== 'http-error',
      headers: { get: key => key === 'x-stale' && result === 'stale' ? 'true' : null },
      json: async () => result === 'spent' ? [] :
        [{ txid: key.repeat(64), vout: key === 'a' ? 0 : 1, value: key === 'a' ? 1000 : 1001 }]
    };
  };
  try { await run(); } finally { global.fetch = original; }
}
test('claimed payment stays claimed after repeated refresh', async () => {
  const p = page();
  await withResponses({a:'spent',b:'unspent'}, async () => {
    await refresh.call(p);
    await refresh.call(p);
  });
  assert.equal(p.rows[0].spent, true);
  assert.equal(p.rows[0].ready, false);
  assert.equal(p.rows[1].ready, true);
  assert.equal(p.readyCount, 1);
});
test('a previously ready payment becomes claimed once spent', async () => {
  const p = page();
  await withResponses({a:'unspent',b:'unspent'}, () => refresh.call(p));
  assert.equal(p.readyCount, 2);
  await withResponses({a:'spent',b:'unspent'}, () => refresh.call(p));
  assert.equal(p.rows[0].ready, false);
  assert.equal(p.rows[0].spent, true);
  assert.equal(p.readyCount, 1);
});
test('stale lookup never re-enables a claimed output', async () => {
  const p = page();
  await withResponses({a:'spent',b:'unspent'}, () => refresh.call(p));
  await withResponses({a:'stale',b:'unspent'}, () => refresh.call(p));
  assert.equal(p.rows[0].checkedSpent, false);
  assert.equal(p.rows[0].ready, false);
  assert.equal(p.readyCount, 1);
});
test('lookup failure cannot mark a claimed payment ready', async () => {
  const p = page();
  await withResponses({a:'http-error',b:'unspent'}, () => refresh.call(p));
  assert.equal(p.rows[0].ready, false);
  assert.equal(p.rows[0].checkedSpent, false);
});
