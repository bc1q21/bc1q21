import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicGiftCommitmentNotice,compareRecipientGiftCommitment} from './public-gift-commitment-notice.mjs';

const binding={network:'regtest',fundingTxid:'a'.repeat(64),
 releaseOutputs:Array.from({length:24},(_,index)=>({
  index,vout:index,sats:12000+index*1000,
  scriptPubKeyHex:'0014'+index.toString(16).padStart(2,'0').repeat(20)
 }))};

test('creator notice is public-only and recipient can compare all 64 digits',()=>{
 const notice=createPublicGiftCommitmentNotice(binding);
 assert.equal(notice.releaseCount,24);
 assert.equal(notice.fingerprint.length,64);
 assert.equal(notice.displayFingerprint.replace(/ /g,''),notice.fingerprint);
 assert.equal(notice.containsRecoveryWords,false);
 assert.equal(notice.containsPrivateKeys,false);
 const checked=compareRecipientGiftCommitment(binding,notice.displayFingerprint);
 assert.equal(checked.commitmentMatches,true);
 assert.equal(checked.creatorAuthenticated,false);
 assert.equal(checked.canExportSigningQr,false);
});

test('recipient rejects abbreviated, altered or mismatched gift fingerprints',()=>{
 const notice=createPublicGiftCommitmentNotice(binding);
 assert.throws(()=>compareRecipientGiftCommitment(binding,notice.fingerprint.slice(0,16)),/Independent gift commitment/);
 assert.throws(()=>compareRecipientGiftCommitment(binding,'f'.repeat(64)),/differs/);
 assert.throws(()=>compareRecipientGiftCommitment({...binding,fundingTxid:'b'.repeat(64)},notice.fingerprint),/differs/);
 assert.throws(()=>compareRecipientGiftCommitment(binding,undefined),/Recipient-supplied/);
});

test('recipient rejects noncanonical formatting and control characters without normalizing',()=>{
 const notice=createPublicGiftCommitmentNotice(binding);
 for(const altered of [
  notice.fingerprint.toUpperCase(),
  ' '+notice.fingerprint,
  notice.fingerprint+' ',
  notice.fingerprint+'\\n',
  notice.fingerprint+'\\t',
  notice.fingerprint.slice(0,8)+'  '+notice.fingerprint.slice(8),
  notice.fingerprint.replace(/(.{4})/g,'$1 ').trim()
 ]) {
  assert.throws(()=>compareRecipientGiftCommitment(binding,altered),
   /Independent gift commitment/);
 }
 assert.equal(compareRecipientGiftCommitment(binding,notice.displayFingerprint).commitmentMatches,true);
});

test('independently retained fingerprint fails closed for every release field',()=>{
 const fingerprint=createPublicGiftCommitmentNotice(binding).fingerprint;
 const alteredDigit=(fingerprint[0]==='a'?'b':'a')+fingerprint.slice(1);
 assert.throws(()=>compareRecipientGiftCommitment(binding,alteredDigit),/differs/);
 const change=(index,patch)=>({...binding,releaseOutputs:binding.releaseOutputs.map(
  (release,i)=>i===index?{...release,...patch}:release)});
 for(const altered of [
  {...binding,fundingTxid:'b'.repeat(64)},
  change(5,{sats:binding.releaseOutputs[5].sats+1}),
  change(5,{vout:99}),
  change(5,{scriptPubKeyHex:'0014'+'fe'.repeat(20)}),
  {...binding,releaseOutputs:[...binding.releaseOutputs].reverse()},
  {...binding,releaseOutputs:binding.releaseOutputs.slice(0,-1)},
  {...binding,releaseOutputs:[...binding.releaseOutputs,
   {index:24,vout:24,sats:10000,scriptPubKeyHex:'0014'+'ab'.repeat(20)}]}
 ]) {
  assert.throws(()=>compareRecipientGiftCommitment(altered,fingerprint));
 }
 assert.equal(compareRecipientGiftCommitment(binding,fingerprint).creatorAuthenticated,false);
});
