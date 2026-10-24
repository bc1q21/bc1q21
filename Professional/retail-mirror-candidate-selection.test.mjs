import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {selectRetailMirrorGiftCandidate} from './retail-mirror-candidate-selection.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const handoff=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex:'e29ac13c',
 childIndex:0,locktime:retailDateToCltvTimestamp('2031-01-15')});
const published={accountXpub,masterFingerprintHex:'e29ac13c',firstDate:'2031-01-15',
 interval:'month',outputScriptsHex:[handoff.fundingScriptPubKeyHex]};
const locator={fundingAddress:'3'+'A'.repeat(33)};
const txid='ab'.repeat(32);
const tx={txid,vout:[{n:0,scriptpubkey_type:'op_return'},
 {n:1,scriptpubkey_address:handoff.fundingAddress,scriptpubkey:handoff.fundingScriptPubKeyHex,value:12345}]};
const core={txid,blockhash:'cd'.repeat(32),vout:[{n:0,scriptPubKey:{hex:'6a'}},
 {n:1,value:0.00012345,scriptPubKey:{hex:handoff.fundingScriptPubKeyHex}}]};
const args={locator,transactions:[tx],published,coreTransactions:[core]};
test('retail-like candidate selection binds scripts and amounts to Core without a fingerprint',()=>{
 const r=selectRetailMirrorGiftCandidate(args);
 assert.equal(r.binding.fundingTxid,txid);
 assert.equal(r.binding.releaseOutputs[0].sats,12345);
 assert.equal(r.creatorAuthenticated,false);
 assert.equal(r.hardwareWalletOwnershipProven,false);
 assert.equal(r.canSign,false);
});
test('rejects altered Core amount or script',()=>{
 for(const changed of [
  {...core,vout:[core.vout[0],{...core.vout[1],value:0.00012346}]},
  {...core,vout:[core.vout[0],{...core.vout[1],scriptPubKey:{hex:'a914'+'00'.repeat(20)+'87'}}]}
 ])assert.throws(()=>selectRetailMirrorGiftCandidate({...args,coreTransactions:[changed]}),/No unique/);
});
test('rejects multiple valid gift candidates instead of trusting ordering',()=>{
 const otherId='ef'.repeat(32);
 assert.throws(()=>selectRetailMirrorGiftCandidate({...args,
  transactions:[tx,{...tx,txid:otherId}],
  coreTransactions:[core,{...core,txid:otherId}]
 }),/Ambiguous/);
});
test('rejects unconfirmed or missing Core evidence',()=>{
 assert.throws(()=>selectRetailMirrorGiftCandidate({...args,coreTransactions:[]}),/No unique/);
 assert.throws(()=>selectRetailMirrorGiftCandidate({...args,
  coreTransactions:[{...core,blockhash:null}]}),/No unique/);
});
