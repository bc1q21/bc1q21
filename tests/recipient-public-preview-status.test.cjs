// Public preview status regression: one outspend request for the entire gift.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../Frontend/gift/gift-h08.js'), 'utf8');
const start = source.indexOf('        async refreshPublicPreviewStatuses(previewTx) {');
const end = source.indexOf('        // Display-only historical USD valuation.', start);
assert.ok(start >= 0 && end > start);
const method = source.slice(start, end).trim().replace(/,\s*$/, '');
const refresh = new Function('return ({' + method + '}).refreshPublicPreviewStatuses')();
const txid = 'a'.repeat(64);
function fixture() {
  const outputs = Array.from({length: 12}, (_, i) => ({
    scriptpubkey_address: '3test' + i, value: 1000 + i
  }));
  return {
    previewTx: {txid, vout: outputs},
    page: {baseApi:'/bitcoin', rows: outputs.map(o => ({
      address:o.scriptpubkey_address, sats:o.value, publicPreviewStatus:null,
      checkedSpent:false, ready:false, spent:false
    }))}
  };
}
async function runWith(result, options = {}) {
  const {page, previewTx} = fixture();
  const original = global.fetch;
  let calls = 0;
  global.fetch = async url => {
    calls++;
    assert.equal(url, '/bitcoin/tx/' + txid + '/outspends');
    if (options.throwError) throw new Error('network error');
    return {
      ok: !options.httpError,
      headers:{get: key => key === 'x-stale' && options.stale ? 'true' : null},
      json:async () => result
    };
  };
  try { await refresh.call(page, previewTx); }
  finally { global.fetch = original; }
  assert.equal(calls, 1);
  assert.ok(page.rows.every(r => r.checkedSpent === false && r.ready === false));
  return page.rows.map(r => r.publicPreviewStatus);
}
test('12 outputs require only one request; claimed, pending and unspent remain distinct', async () => {
  const items = Array.from({length:12}, () => ({spent:false}));
  items[0] = {spent:true, status:{confirmed:true}};
  items[3] = {spent:true, status:{confirmed:false}};
  const statuses = await runWith(items);
  assert.equal(statuses[0], 'Claimed');
  assert.equal(statuses[3], 'Pending confirmation');
  assert.equal(statuses[10], 'Unclaimed');
  assert.equal(statuses[11], 'Unclaimed');
});
test('missing confirmation never guesses claimed', async () => {
  const items = Array.from({length:12}, () => ({spent:false}));
  items[3] = {spent:true};
  assert.equal((await runWith(items))[3], null);
});
test('incomplete response cannot report unspent', async () => {
  assert.ok((await runWith([{spent:false}])).every(x => x === null));
});
test('HTTP failure cannot report unspent', async () => {
  assert.ok((await runWith([], {httpError:true})).every(x => x === null));
});
test('stale response cannot report unspent', async () => {
  assert.ok((await runWith([], {stale:true})).every(x => x === null));
});
test('network failure cannot report unspent', async () => {
  assert.ok((await runWith([], {throwError:true})).every(x => x === null));
});
