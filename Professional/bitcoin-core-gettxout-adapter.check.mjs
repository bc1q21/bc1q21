import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBitcoinCoreGettxout} from './bitcoin-core-gettxout-adapter.mjs';
const txid='11'.repeat(32);
const valid=()=>({value:0.000126,confirmations:3,scriptPubKey:{hex:'0014'+'aa'.repeat(20)}});
test('maps confirmed public Bitcoin Core UTXO response into snapshot shape',()=>{
 const r=parseBitcoinCoreGettxout(txid,0,valid());
 assert.equal(r.valueSats,12600);
 assert.equal(r.confirmed,true);
 assert.equal(r.spent,false);
});
test('rejects missing, unconfirmed, malformed and fractional satoshi responses',()=>{
 for(const response of [null,{...valid(),confirmations:0},{...valid(),value:0.000000001},{...valid(),scriptPubKey:{hex:'zz'}},{...valid(),value:-1}]){
  assert.throws(()=>parseBitcoinCoreGettxout(txid,0,response));
 }
});
