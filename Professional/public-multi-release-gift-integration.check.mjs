// Public-only multi-release fixture: independently derive CLTV outputs from a
// disposable account xpub and verify a synthetic retail-format distribution.
// This does not prove device compatibility, signatures, or chain state.
import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {verifyPublicRetailSchedule} from './public-retail-schedule-verify.mjs';
import {checkGiftDistributionAgainstSnapshot} from './gift-distribution-snapshot-gate.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const dates=['2031-01-15','2031-02-15','2031-03-15','2031-04-15'];
const amounts=[12000,15000,18000,21000];
const scripts=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}).fundingScriptPubKeyHex);
const feeScript='0014'+'ab'.repeat(20);
const opReturn='4243315132314731';
const funding=[{txid:'11'.repeat(32),vout:0,valueSats:66500,scriptPubKeyHex:feeScript}];
const snapshot=[{...funding[0],spent:false,confirmed:true}];
const envelope=()=>({operation:'gift-distribution',network:'regtest',
 giftReference:'22'.repeat(32),publicPayload:{
 giftOutputs:scripts.map((scriptPubKeyHex,i)=>({scriptPubKeyHex,valueSats:amounts[i]})),
 serviceFeeOutput:{scriptPubKeyHex:feeScript,valueSats:400},
 changeOutput:null,minerFeeSats:100,encryptedFirstDateHex:opReturn
}});
function syntheticTx({mutateIndex=-1,mutateScript=false}={}){
 const tx=new bitcoin.Transaction();
 tx.addInput(Buffer.from(funding[0].txid,'hex').reverse(),0);
 scripts.forEach((script,i)=>tx.addOutput(Buffer.from(mutateScript && i===mutateIndex?feeScript:script,'hex'),
   amounts[i]+(i===mutateIndex&&!mutateScript?1:0)));
 tx.addOutput(Buffer.from(feeScript,'hex'),400);
 tx.addOutput(bitcoin.script.compile([bitcoin.opcodes.OP_RETURN,Buffer.from(opReturn,'hex')]),0);
 return tx.toHex();
}
test('four distinct public CLTV scripts match monthly retail dates and exact distribution intent',()=>{
 const schedule=verifyPublicRetailSchedule({accountXpub,masterFingerprintHex,
   firstDate:dates[0],interval:'month',outputScriptsHex:scripts});
 assert.deepEqual(schedule.releases.map(x=>x.date),dates);
 assert.equal(new Set(scripts).size,4);
 const result=checkGiftDistributionAgainstSnapshot(envelope(),funding,snapshot,syntheticTx());
 assert.equal(result.releaseCount,4);
 assert.equal(result.giftSats,66000);
 assert.equal(result.outputsMatch,true);
 assert.equal(result.signaturesVerified,false);
 assert.equal(result.chainVerified,false);
});
test('rejects altered release amount or CLTV output script',()=>{
 assert.throws(()=>checkGiftDistributionAgainstSnapshot(envelope(),funding,snapshot,
   syntheticTx({mutateIndex:2})),/changed/);
 assert.throws(()=>checkGiftDistributionAgainstSnapshot(envelope(),funding,snapshot,
   syntheticTx({mutateIndex:1,mutateScript:true})),/changed/);
});
test('rejects a shifted first date against all four gift outputs',()=>{
 assert.throws(()=>verifyPublicRetailSchedule({accountXpub,masterFingerprintHex,
   firstDate:'2031-01-16',interval:'month',outputScriptsHex:scripts}),/does not match/);
});
