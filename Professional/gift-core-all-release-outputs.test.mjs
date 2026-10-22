import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyScheduledGiftCoreOutputs} from './gift-core-all-release-outputs.mjs';

const txid='a'.repeat(64), block='b'.repeat(64), tip='c'.repeat(64);
const scripts=['0014'+'11'.repeat(20),'0014'+'22'.repeat(20)];
const binding={network:'regtest',fundingTxid:txid,releaseOutputs:scripts.map((script,index)=>({
 index,vout:index,sats:12000+index*1000,scriptPubKeyHex:script
}))};
const transaction={txid,blockhash:block,vout:scripts.map((script,n)=>({
 n,value:(12000+n*1000)/100000000,scriptPubKey:{hex:script}
}))};
const utxos=scripts.map((script,n)=>({
 bestblock:tip,confirmations:3,value:(12000+n*1000)/100000000,scriptPubKey:{hex:script}
}));
const inspect=(b=binding,t=transaction,u=utxos,hash=tip)=>verifyScheduledGiftCoreOutputs(b,t,u,hash);

test('verifies every distinct gift release while leaving signing disabled',()=>{
 const result=inspect();
 assert.equal(result.releaseCount,2);
 assert.equal(result.outputsConsistent,true);
 assert.equal(result.canSign,false);
 assert.equal(result.canExportSigningQr,false);
 assert.equal(result.beneficiaryAuthorized,false);
});

test('rejects wrong gift transaction and script substitution',()=>{
 assert.throws(()=>inspect(binding,{...transaction,txid:'d'.repeat(64)}),/does not match gift/);
 const bad={...transaction,vout:[{...transaction.vout[0],scriptPubKey:{hex:scripts[1]}},transaction.vout[1]]};
 assert.throws(()=>inspect(binding,bad),/script mismatch/);
});

test('rejects wrong amount, spent output, changed tip and missing release',()=>{
 assert.throws(()=>inspect(binding,transaction,[{...utxos[0],value:0.5},utxos[1]]),/amount mismatch/);
 assert.throws(()=>inspect(binding,transaction,[utxos[0],null]),/spent or unconfirmed/);
 assert.throws(()=>inspect(binding,transaction,[{...utxos[0],bestblock:'d'.repeat(64)},utxos[1]]),/wrong chain tip/);
 assert.throws(()=>inspect(binding,transaction,[utxos[0]]),/One UTXO observation/);
});

test('rejects duplicated outpoint or reordered release',()=>{
 const repeated={...binding,releaseOutputs:[binding.releaseOutputs[0],{...binding.releaseOutputs[1],vout:0}]};
 assert.throws(()=>inspect(repeated),/duplicate outpoint/);
 const reordered={...binding,releaseOutputs:[binding.releaseOutputs[1],binding.releaseOutputs[0]]};
 assert.throws(()=>inspect(reordered),/Release order mismatch/);
});
