import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileTrustedUtxoSnapshot} from './trusted-utxo-snapshot-check.mjs';
const input=()=>({txid:'11'.repeat(32),vout:0,valueSats:12600,scriptPubKeyHex:'0014'+'aa'.repeat(20)});
const snapshot=()=>({...input(),spent:false,confirmed:true});
test('matches public funding amount and script to caller-supplied snapshot',()=>{
 const r=reconcileTrustedUtxoSnapshot([input()],[snapshot()]);
 assert.equal(r.publicInputsMatch,true);
 assert.equal(r.chainVerified,false);
 assert.equal(r.snapshotSourceVerified,false);
});
test('rejects spent, unconfirmed, absent, or altered UTXO data',()=>{
 for(const change of [{spent:true},{confirmed:false},{valueSats:12599},{scriptPubKeyHex:'0014'+'bb'.repeat(20)},{txid:'22'.repeat(32)}]){
  assert.throws(()=>reconcileTrustedUtxoSnapshot([input()],[{...snapshot(),...change}]));
 }
});
test('rejects duplicate snapshot or requested outpoints',()=>{
 assert.throws(()=>reconcileTrustedUtxoSnapshot([input(),input()],[snapshot()]),/Duplicate requested/);
 assert.throws(()=>reconcileTrustedUtxoSnapshot([input()],[snapshot(),snapshot()]),/Duplicate snapshot/);
});
