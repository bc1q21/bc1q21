import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync,sign } from 'node:crypto';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PinnedDurableScheduleReturnGate } from './pinned-durable-schedule-return-gate.mjs';
import { FileDurableNonceStore } from './file-durable-nonce-store.mjs';
import { scheduleResponseSigningBytes } from './pinned-offline-schedule-response.mjs';
import { deriveJadePublicCltvHandoff } from './jade-xpub-cltv-handoff.mjs';
import { retailDateToCltvTimestamp } from './retail-calendar-cltv.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c',giftTxid='ab'.repeat(32);
const dates=['2031-01-15','2031-02-15'];
const outputScriptsHex=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}).fundingScriptPubKeyHex);
const args={giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex};
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const pinnedPublicKeyPem=publicKey.export({type:'spki',format:'pem'}).toString();
function envelope(challenge){
 const response={version:1,kind:'bc1q21-professional-schedule-response',giftTxid,
 nonceHex:challenge.nonceHex,outputCommitment:challenge.outputCommitment,
 firstDate:dates[0],interval:'month'};
 return {version:1,kind:'bc1q21-professional-signed-schedule-response',response,
 signatureHex:sign(null,scheduleResponseSigningBytes(response),privateKey).toString('hex')};
}
test('pinned identity and durable nonce both pass, then replay fails across new instance',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'bc1q21-pinned-gate-'));
 try {
  const gate=new PinnedDurableScheduleReturnGate({store:new FileDurableNonceStore({directory})});
  const challenge=gate.create({...args,nonceHex:'aa'.repeat(16)});
  const signed=envelope(challenge);
  const result=await gate.complete({...args,challenge,envelope:signed,pinnedPublicKeyPem});
  assert.equal(result.pinnedIdentitySignatureValid,true);
  assert.equal(result.nonceClaimedDurablyByStore,true);
  assert.equal(result.seedPossessionProven,false);
  const restarted=new PinnedDurableScheduleReturnGate({store:new FileDurableNonceStore({directory})});
  await assert.rejects(()=>restarted.complete({...args,challenge,envelope:signed,pinnedPublicKeyPem}),/already consumed/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('tampered signature consumes nonce, corrected signature cannot reuse challenge',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'bc1q21-pinned-gate-'));
 try {
  const gate=new PinnedDurableScheduleReturnGate({store:new FileDurableNonceStore({directory})});
  const challenge=gate.create({...args,nonceHex:'bb'.repeat(16)});
  const signed=envelope(challenge);
  const tampered={...signed,signatureHex:'00'.repeat(64)};
  await assert.rejects(()=>gate.complete({...args,challenge,envelope:tampered,pinnedPublicKeyPem}),/signature verification failed/);
  await assert.rejects(()=>gate.complete({...args,challenge,envelope:signed,pinnedPublicKeyPem}),/already consumed/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
