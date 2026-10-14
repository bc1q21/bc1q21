import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcilePublicGiftDistribution} from './public-gift-distribution-accounting.mjs';
const output=(valueSats)=>({scriptPubKeyHex:'a914'+'ab'.repeat(20)+'87',valueSats});
const gift=()=>({
 operation:'gift-distribution',network:'regtest',giftReference:'a'.repeat(64),
 publicPayload:{giftOutputs:[output(7000),output(5000)],
 serviceFeeOutput:output(500),changeOutput:null,minerFeeSats:100,encryptedFirstDateHex:'4243315132314731'}
});
test('retains multiple retail gift output amounts and balances funding',()=>{
 const r=reconcilePublicGiftDistribution(gift(),[12600]);
 assert.equal(r.giftSats,12000);
 assert.equal(r.releaseCount,2);
 assert.deepEqual(r.orderedGiftOutputs.map(o=>o.valueSats),[7000,5000]);
 assert.equal(r.outputsSats,12500);
 assert.equal(r.signingReady,false);
});
test('fails closed on funding imbalance and wrong operation',()=>{
 assert.throws(()=>reconcilePublicGiftDistribution(gift(),[12599]),/balance/);
 assert.throws(()=>reconcilePublicGiftDistribution({...gift(),operation:'gift-release'},[12600]));
});
test('accounts for optional change without modifying gift outputs',()=>{
 const e=gift();e.publicPayload.changeOutput=output(400);
 const r=reconcilePublicGiftDistribution(e,[13000]);
 assert.equal(r.changeSats,400);
 assert.deepEqual(r.orderedGiftOutputs.map(o=>o.valueSats),[7000,5000]);
});
