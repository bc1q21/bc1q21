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
