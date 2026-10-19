import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectOneGiftCoreUtxos} from './one-gift-core-utxo-continuity.mjs';
const txid='a'.repeat(64),bestblockhash='b'.repeat(64),script='a914'+'11'.repeat(20)+'87';
const binding={format:'bc1q21-professional-one-gift-raw-funding-binding-v1',network:'regtest',fundingTxid:txid,releaseOutputs:[{vout:2,sats:123456,scriptPubKeyHex:script}]};
const chain={chain:'regtest',blocks:120,bestblockhash};
const response={value:0.00123456,confirmations:3,bestblock:bestblockhash,scriptPubKey:{hex:script}};
const observation={txid,vout:2,response};
test('matching Core-like response remains untrusted and cannot authorize spending',()=>{
 const result=inspectOneGiftCoreUtxos(binding,chain,[observation]);
 assert.equal(result.coreResponsesConsistent,true);
 for(const flag of ['rpcProvenanceVerified','chainVerified','authenticated','recipientAuthenticated','readyForLiveRouting','canSign','canBroadcast'])assert.equal(result[flag],false);
});
test('reject missing, spent, unconfirmed, wrong output, changed amount/script or chain tip',()=>{
 const run=(obs=[observation],ci=chain)=>inspectOneGiftCoreUtxos(binding,ci,obs);
 assert.throws(()=>run([{...observation,response:null}]),/absent or spent/);
 assert.throws(()=>run([{...observation,response:{...response,confirmations:0}}]),/unconfirmed/);
 assert.throws(()=>run([{...observation,vout:3}]),/index differs/);
 assert.throws(()=>run([{...observation,txid:'c'.repeat(64)}]),/transaction differs/);
 assert.throws(()=>run([{...observation,response:{...response,value:0.00123457}}]),/amount differs/);
 assert.throws(()=>run([{...observation,response:{...response,scriptPubKey:{hex:'0014'+'11'.repeat(20)}}}]),/script differs/);
 assert.throws(()=>run([{...observation,response:{...response,bestblock:'c'.repeat(64)}}]),/chain tip differ/);
 assert.throws(()=>run([observation],{...chain,chain:'main'}),/Regtest/);
 assert.throws(()=>run([]),/One Core/);
});
