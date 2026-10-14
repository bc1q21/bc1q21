import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deriveJadePublicCltvHandoff } from './jade-xpub-cltv-handoff.mjs';
import { retailDateToCltvTimestamp } from './retail-calendar-cltv.mjs';
import { DurablePublicScheduleGate } from './durable-public-schedule-gate.mjs';
import { FileDurableNonceStore } from './file-durable-nonce-store.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c',giftTxid='ab'.repeat(32);
const dates=['2031-01-15','2031-02-15','2031-03-15'];
const outputScriptsHex=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}).fundingScriptPubKeyHex);
const args={giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex};
const responseFor=challenge=>({version:1,kind:'bc1q21-professional-schedule-response',
 giftTxid,nonceHex:challenge.nonceHex,outputCommitment:challenge.outputCommitment,
 firstDate:dates[0],interval:'month'});
test('real file-backed nonce store enforces one successful schedule return across restarted gates',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'bc1q21-full-gate-'));
 try {
  const first=new DurablePublicScheduleGate({store:new FileDurableNonceStore({directory})});
  const challenge=first.create({...args,nonceHex:'12'.repeat(16)});
  const result=await first.complete({...args,challenge,response:responseFor(challenge)});
  assert.deepEqual(result.schedule.releases.map(x=>x.date),dates);
  assert.equal(result.nonceClaimedDurablyByStore,true);
  assert.equal(result.deviceAuthenticated,false);
  const afterRestart=new DurablePublicScheduleGate({store:new FileDurableNonceStore({directory})});
  await assert.rejects(()=>afterRestart.complete({...args,challenge,response:responseFor(challenge)}),/already consumed/);
 } finally {await rm(directory,{recursive:true,force:true});}
});
test('invalid return permanently consumes file-backed nonce even across restart',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'bc1q21-full-gate-'));
 try {
  const first=new DurablePublicScheduleGate({store:new FileDurableNonceStore({directory})});
  const challenge=first.create({...args,nonceHex:'34'.repeat(16)});
  await assert.rejects(()=>first.complete({...args,challenge,
    response:{...responseFor(challenge),interval:'year'}}));
  const afterRestart=new DurablePublicScheduleGate({store:new FileDurableNonceStore({directory})});
  await assert.rejects(()=>afterRestart.complete({...args,challenge,response:responseFor(challenge)}),/already consumed/);
 } finally {await rm(directory,{recursive:true,force:true});}
});
