import assert from 'node:assert/strict';
import {giftLocator,inspectCandidates} from './gift-link-public-candidate.mjs';
const addr='3'+'A'.repeat(33);
const gift='https://example.invalid/gift/'+addr;
const txid='ab'.repeat(32);
const script='a914'+'12'.repeat(20)+'87';
const candidate=(id,amount=12000)=>({
 txid:id,
 vout:[{n:0,scriptpubkey_type:'op_return',scriptpubkey:'6a00',value:0},
 {n:1,scriptpubkey_type:'p2sh',scriptpubkey_address:addr,scriptpubkey:script,value:amount}]
});
assert.deepEqual(giftLocator(gift),{fundingAddress:addr,interval:'month'});
assert.deepEqual(giftLocator('https://example.invalid/gift/?a='+addr+'&interval=year'),{fundingAddress:addr,interval:'year'});
assert.deepEqual(giftLocator('https://example.invalid/gift/'+addr+'?a='+addr),{fundingAddress:addr,interval:'month'});
for(const url of [
 'https://example.invalid/gift/'+addr+'?a=3'+'B'.repeat(33),
 'https://example.invalid/gift/'+addr+'?seed=fictional',
 'https://example.invalid/gift/'+addr+'?a='+addr+'&a='+addr,
 'https://example.invalid/gift/'+addr+'?interval=week',
 'https://example.invalid/gift/garbage',
 'https://example.invalid/gift/'+addr+'#private',
 'https://example.invalid/gift'
]) assert.throws(()=>giftLocator(url),'reject invalid/secret-bearing link');
const loc=giftLocator(gift);
let result=inspectCandidates(loc,[candidate(txid)]);
assert.equal(result.state,'preview-only');
assert.equal(result.candidateCount,1);
assert.equal(result.authenticated,false);
assert.equal(result.candidates[0].outputs[0].sats,12000);
assert.equal(inspectCandidates(loc,[]).state,'not-found');
assert.equal(inspectCandidates(loc,[candidate(txid),candidate('cd'.repeat(32))]).state,'ambiguous');
assert.equal(inspectCandidates(loc,[{txid,vout:[{n:0,scriptpubkey_type:'op_return'}]}]).state,'not-found');
assert.equal(inspectCandidates(loc,[{txid,vout:[{n:1,scriptpubkey_address:addr,scriptpubkey:script,value:12000}]}]).state,'not-found');
assert.equal(inspectCandidates(loc,[candidate('not-a-txid')]).state,'not-found');
assert.throws(()=>inspectCandidates(loc,[{txid,vout:[{n:0,scriptpubkey_type:'op_return'},
 {n:1,scriptpubkey_address:addr,scriptpubkey:script,value:12000},
 {n:1,scriptpubkey_address:addr,scriptpubkey:script,value:10000}]}]));
console.log('PASS public-only retail gift-card locator and candidate ambiguity fail-closed tests');
console.log('NOT PROVEN: actual gift link authenticated, address ownership, OP_RETURN decryption, Jade recovery, or 24-release discovery');
