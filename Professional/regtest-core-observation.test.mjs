import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCoreFundingObservation} from './regtest-core-observation.mjs';
const cp={version:1,chain:'regtest',fundingTxid:'a'.repeat(64),vout:1,amountSats:100000,
 scriptPubKeyHex:'a914'+'b'.repeat(40)+'87',fundingBlockHash:'c'.repeat(64),fundingBlockHeight:121};
const sample={
 chainInfo:{chain:'regtest',blocks:123},
 transaction:{txid:cp.fundingTxid,blockhash:cp.fundingBlockHash,vout:[
  {n:0,value:0.01,scriptPubKey:{hex:'0014'+'d'.repeat(40)}},
  {n:1,value:0.001,scriptPubKey:{hex:cp.scriptPubKeyHex}}]},
 blockHeader:{hash:cp.fundingBlockHash,height:121,confirmations:3},
 txout:{value:0.001,confirmations:3,scriptPubKey:{hex:cp.scriptPubKeyHex},bestblock:'e'.repeat(64)}
};
test('maps Bitcoin Core transaction/block/UTXO responses to verified regtest checkpoint',()=>{
 assert.equal(verifyCoreFundingObservation(cp,sample).verified,true);
});
test('fails closed for wrong chain, reorg, spent output, or changed script/amount',()=>{
 assert.throws(()=>verifyCoreFundingObservation(cp,{...sample,chainInfo:{chain:'main'}}));
 assert.throws(()=>verifyCoreFundingObservation(cp,{...sample,blockHeader:{...sample.blockHeader,hash:'f'.repeat(64)}}));
 assert.throws(()=>verifyCoreFundingObservation(cp,{...sample,txout:null}));
 assert.throws(()=>verifyCoreFundingObservation(cp,{...sample,txout:{...sample.txout,value:0.002}}));
 assert.throws(()=>verifyCoreFundingObservation(cp,{...sample,txout:{...sample.txout,scriptPubKey:{hex:'a914'+'f'.repeat(40)+'87'}}}));
 assert.throws(()=>verifyCoreFundingObservation(cp,{...sample,transaction:{...sample.transaction,blockhash:'f'.repeat(64)}}));
});
test('rejects fractional-satoshi amounts and unconfirmed funding',()=>{
 assert.throws(()=>verifyCoreFundingObservation(cp,{...sample,txout:{...sample.txout,value:0.001000005}}));
 assert.throws(()=>verifyCoreFundingObservation(cp,{...sample,txout:{...sample.txout,confirmations:0}}));
});
