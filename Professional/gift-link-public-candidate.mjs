// Professional isolated gift-card locator: PUBLIC-ONLY candidate inspection.
// Mirrors retail address -> transactions -> candidate filter, but never equates
// a candidate with an authenticated gift. No signing or private wallet operations.
import assert from 'node:assert/strict';
const ADDRESS=/^(?:[123mn][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1q[ac-hj-np-z02-9]{11,87}|bcrt1q[ac-hj-np-z02-9]{11,87})$/;
const TXID=/^[a-f0-9]{64}$/;
const SCRIPT=/^a914[a-f0-9]{40}87$/;
export function giftLocator(urlString) {
  const u=new URL(urlString);
  // Only a public gift-link identity is allowed. Never accept secret-bearing fields.
  for(const k of u.searchParams.keys())
    assert.ok(['a','address','interval'].includes(k),'Unexpected query parameter');
  assert.ok(!u.username&&!u.password&&!u.hash,'URL credentials/fragments forbidden');
  const parts=u.pathname.split('/').filter(Boolean);
  const fromPath=parts.length===2&&parts[0]==='gift'?parts[1]:null;
  const qa=u.searchParams.getAll('a'),qb=u.searchParams.getAll('address');
  assert.ok(qa.length<=1&&qb.length<=1,'Duplicate address fields');
  const vals=[fromPath,...qa,...qb].filter(Boolean);
  assert.ok(vals.length,'Gift funding-address locator missing');
  assert.ok(vals.every(x=>x===vals[0]),'Gift address conflict in URL');
  assert.match(vals[0],ADDRESS,'Invalid funding address');
  const iv=u.searchParams.get('interval')||'month';
  assert.ok(['month','year'].includes(iv),'Unsupported interval');
  return Object.freeze({fundingAddress:vals[0],interval:iv});
}
export function inspectCandidates(locator,txs) {
  assert.ok(locator&&typeof locator.fundingAddress==='string');
  assert.ok(Array.isArray(txs)&&txs.length<=10000);
  const candidates=[];
  for(const tx of txs){
    if(!tx||!TXID.test(tx.txid)||!Array.isArray(tx.vout))continue;
    // The API response can be untrusted and unordered.
    const op=tx.vout.filter(x=>x?.scriptpubkey_type==='op_return');
    const outputs=tx.vout.filter(x=>typeof x?.scriptpubkey_address==='string'&&
      x.scriptpubkey_address.startsWith('3')&&SCRIPT.test(x.scriptpubkey||'')&&
      Number.isSafeInteger(x.value)&&x.value>0);
    if(!op.length||!outputs.length)continue;
    const indices=outputs.map((x,i)=>{
      assert.ok(Number.isInteger(x.n)&&x.n>=0,'Invalid output index');
      return {vout:x.n,scriptPubKey:x.scriptpubkey,sats:x.value,address:x.scriptpubkey_address};
    });
    assert.equal(new Set(indices.map(x=>x.vout)).size,indices.length,'Duplicate output index');
    candidates.push({txid:tx.txid,releaseCount:indices.length,outputs:indices});
  }
  // Deliberately fail closed if gift identity could be ambiguous. Real wallet-derived
  // validation or signed public gift commitment is NOT YET IMPLEMENTED.
  const state=candidates.length===0?'not-found':candidates.length===1?'preview-only':'ambiguous';
  return {state,authenticated:false,
          reason:'Candidates are public previews, not proven gift or recovery schedule',
          candidateCount:candidates.length,candidates};
}
