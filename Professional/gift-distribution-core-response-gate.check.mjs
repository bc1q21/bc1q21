import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {checkGiftDistributionWithCoreResponses} from './gift-distribution-core-response-gate.mjs';
const script='0014'+'ab'.repeat(20);
const funding=[{txid:'11'.repeat(32),vout:0,valueSats:12600,scriptPubKeyHex:script}];
const envelope={operation:'gift-distribution',network:'regtest',giftReference:'22'.repeat(32),
 publicPayload:{giftOutputs:[{scriptPubKeyHex:script,valueSats:7000},{scriptPubKeyHex:script,valueSats:5000}],
 serviceFeeOutput:{scriptPubKeyHex:script,valueSats:500},changeOutput:null,minerFeeSats:100,
 encryptedFirstDateHex:'4243315132314731'}};
const response=()=>({value:0.000126,confirmations:2,scriptPubKey:{hex:script}});
function txHex(){
 const tx=new bitcoin.Transaction();
 tx.addInput(Buffer.from(funding[0].txid,'hex').reverse(),0);
 for(const n of [7000,5000,500]) tx.addOutput(Buffer.from(script,'hex'),n);
 tx.addOutput(bitcoin.script.compile([bitcoin.opcodes.OP_RETURN,Buffer.from('4243315132314731','hex')]),0);
 return tx.toHex();
}
test('accepts matching public Core response and transaction intent',()=>{
 const r=checkGiftDistributionWithCoreResponses(envelope,funding,[response()],txHex());
 assert.equal(r.outputsMatch,true);
 assert.equal(r.publicInputsMatch,true);
 assert.equal(r.chainVerified,false);
});
test('rejects spent, unconfirmed, changed value or wrong script Core responses',()=>{
 for(const bad of [null,{...response(),confirmations:0},{...response(),value:0.000125},{...response(),scriptPubKey:{hex:'0014'+'cc'.repeat(20)}}]){
  assert.throws(()=>checkGiftDistributionWithCoreResponses(envelope,funding,[bad],txHex()));
 }
});
test('rejects missing response count',()=>{
 assert.throws(()=>checkGiftDistributionWithCoreResponses(envelope,funding,[],txHex()),/one Bitcoin Core response/);
});
