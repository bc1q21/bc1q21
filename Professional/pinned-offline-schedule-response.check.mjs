import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { deriveJadePublicCltvHandoff } from './jade-xpub-cltv-handoff.mjs';
import { retailDateToCltvTimestamp } from './retail-calendar-cltv.mjs';
import { scheduleResponseSigningBytes,verifyPinnedOfflineScheduleResponse } from './pinned-offline-schedule-response.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c',giftTxid='ab'.repeat(32);
const dates=['2031-01-15','2031-02-15'];
const outputScriptsHex=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}).fundingScriptPubKeyHex);
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const pinnedPublicKeyPem=publicKey.export({type:'spki',format:'pem'}).toString();
const challenge={version:1,kind:'bc1q21-professional-schedule-challenge',giftTxid,
 nonceHex:'11'.repeat(16),outputCommitment:''};
import { createPublicScheduleChallenge } from './public-schedule-return.mjs';
const realChallenge=createPublicScheduleChallenge({giftTxid,outputScriptsHex,nonceHex:challenge.nonceHex});
const response={version:1,kind:'bc1q21-professional-schedule-response',
 giftTxid,nonceHex:realChallenge.nonceHex,outputCommitment:realChallenge.outputCommitment,
 firstDate:dates[0],interval:'month'};
function signedEnvelope(value,key=privateKey) {
 return {version:1,kind:'bc1q21-professional-signed-schedule-response',response:value,
  signatureHex:sign(null,scheduleResponseSigningBytes(value),key).toString('hex')};
}
const args={challenge:realChallenge,giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex,pinnedPublicKeyPem};
test('synthetic pinned Ed25519 identity validates signed public schedule context',()=>{
 const result=verifyPinnedOfflineScheduleResponse({...args,envelope:signedEnvelope(response)});
 assert.equal(result.pinnedIdentitySignatureValid,true);
 assert.equal(result.seedPossessionProven,false);
 assert.equal(result.physicalApprovalProven,false);
 assert.equal(result.schedule.releaseCount,2);
});
test('altered signed payload and unpinned key are rejected',()=>{
 const envelope=signedEnvelope(response);
 assert.throws(()=>verifyPinnedOfflineScheduleResponse({...args,envelope:{
  ...envelope,response:{...response,firstDate:'2031-01-16'}}}));
 const other=generateKeyPairSync('ed25519');
 assert.throws(()=>verifyPinnedOfflineScheduleResponse({...args,envelope,
  pinnedPublicKeyPem:other.publicKey.export({type:'spki',format:'pem'}).toString()}));
});
test('extra response field is rejected before signature verification',()=>{
 assert.throws(()=>scheduleResponseSigningBytes({...response,mnemonic:'forbidden'}));
});
