import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {checkSignedGiftDistributionOutputs} from './signed-gift-output-intent-check.mjs';
const script='0014'+'ab'.repeat(20);
const inputTxid='11'.repeat(32);
const envelope=()=>({operation:'gift-distribution',network:'regtest',
 giftReference:'22'.repeat(32),publicPayload:{
 giftOutputs:[{scriptPubKeyHex:script,valueSats:7000},{scriptPubKeyHex:script,valueSats:5000}],
 serviceFeeOutput:{scriptPubKeyHex:script,valueSats:500},changeOutput:null,minerFeeSats:100,encryptedFirstDateHex:'4243315132314731'}});
const inputs=[{txid:inputTxid,vout:0,valueSats:12600,scriptPubKeyHex:script}];
function syntheticTx(values=[7000,5000,500],txid=inputTxid){
 const tx=new bitcoin.Transaction();
 tx.addInput(Buffer.from(txid,'hex').reverse(),0);
 for(const n of values) tx.addOutput(Buffer.from(script,'hex'),n);
 tx.addOutput(bitcoin.script.compile([bitcoin.opcodes.OP_RETURN,Buffer.from('4243315132314731','hex')]),0);
 return tx.toHex();
}
test('checks exact output amounts and ordering without claiming signatures verified',()=>{
 const r=checkSignedGiftDistributionOutputs(envelope(),inputs,syntheticTx());
 assert.equal(r.outputsMatch,true);
 assert.equal(r.signaturesVerified,false);
 assert.equal(r.utxosVerified,false);
 assert.equal(r.broadcast,false);
});
test('rejects changed gift amount, missing fee output, changed outpoint',()=>{
 assert.throws(()=>checkSignedGiftDistributionOutputs(envelope(),inputs,syntheticTx([7001,4999,500])),/changed/);
 assert.throws(()=>checkSignedGiftDistributionOutputs(envelope(),inputs,syntheticTx([7000,5000])),/count/);
 assert.throws(()=>checkSignedGiftDistributionOutputs(envelope(),inputs,syntheticTx([7000,5000,500],'33'.repeat(32))),/input changed/);
});

test('rejects modified encrypted first-date OP_RETURN',()=>{
 const tx=bitcoin.Transaction.fromHex(syntheticTx());
 tx.outs[3].script=bitcoin.script.compile([bitcoin.opcodes.OP_RETURN,Buffer.from('ffff','hex')]);
 assert.throws(()=>checkSignedGiftDistributionOutputs(envelope(),inputs,tx.toHex()),/OP_RETURN/);
});

test('rejects duplicate funding outpoints before transaction review',()=>{
 const duplicate=[inputs[0],inputs[0]];
 assert.throws(()=>checkSignedGiftDistributionOutputs(envelope(),duplicate,syntheticTx()),/Duplicate funding outpoint/);
});

test('rejects absent funding scripts and mixed funding scripts',()=>{
 assert.throws(()=>checkSignedGiftDistributionOutputs(envelope(),[{txid:inputTxid,vout:0,valueSats:12600}],syntheticTx()),/funding outpoints/);
 const other={txid:'44'.repeat(32),vout:1,valueSats:100,scriptPubKeyHex:'0014'+'cd'.repeat(20)};
 assert.throws(()=>checkSignedGiftDistributionOutputs(envelope(),[{...inputs[0],valueSats:12500},other],syntheticTx()),/Mixed funding scripts/);
});
