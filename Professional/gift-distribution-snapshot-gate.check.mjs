import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {checkGiftDistributionAgainstSnapshot} from './gift-distribution-snapshot-gate.mjs';
const script='0014'+'ab'.repeat(20);
const input=()=>({txid:'11'.repeat(32),vout:0,valueSats:12600,scriptPubKeyHex:script});
const envelope=()=>({operation:'gift-distribution',network:'regtest',
 giftReference:'22'.repeat(32),publicPayload:{
 giftOutputs:[{scriptPubKeyHex:script,valueSats:7000},{scriptPubKeyHex:script,valueSats:5000}],
 serviceFeeOutput:{scriptPubKeyHex:script,valueSats:500},changeOutput:null,
 minerFeeSats:100,encryptedFirstDateHex:'4243315132314731'}});
const transaction=(firstAmount=7000)=>{
 const tx=new bitcoin.Transaction();
 tx.addInput(Buffer.from('11'.repeat(32),'hex').reverse(),0);
 for(const amount of [firstAmount,5000,500]) tx.addOutput(Buffer.from(script,'hex'),amount);
 tx.addOutput(bitcoin.script.compile([bitcoin.opcodes.OP_RETURN,Buffer.from('4243315132314731','hex')]),0);
 return tx.toHex();
};
test('requires matching public UTXO snapshot and exact transaction intent',()=>{
 const r=checkGiftDistributionAgainstSnapshot(envelope(),[input()],[{...input(),spent:false,confirmed:true}],transaction());
 assert.equal(r.publicInputsMatch,true);
 assert.equal(r.outputsMatch,true);
 assert.equal(r.signaturesVerified,false);
 assert.equal(r.chainVerified,false);
});
test('rejects a snapshot amount mismatch even when transaction outputs match',()=>{
 assert.throws(()=>checkGiftDistributionAgainstSnapshot(envelope(),[input()],[{...input(),valueSats:12500,spent:false,confirmed:true}],transaction()),/differs/);
});
test('rejects changed gift output even when snapshot matches',()=>{
 assert.throws(()=>checkGiftDistributionAgainstSnapshot(envelope(),[input()],[{...input(),spent:false,confirmed:true}],transaction(7001)),/changed/);
});
