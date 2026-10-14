import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveJadePublicCltvHandoff } from './jade-xpub-cltv-handoff.mjs';
import { retailDateToCltvTimestamp } from './retail-calendar-cltv.mjs';
import { createPublicScheduleChallenge,verifyPublicScheduleReturn } from './public-schedule-return.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c',giftTxid='ab'.repeat(32),nonceHex='01'.repeat(16);
const dates=['2031-01-15','2031-02-15'];
const outputScriptsHex=dates.map((date,index)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex:index,locktime:retailDateToCltvTimestamp(date)
}).fundingScriptPubKeyHex);
const args={giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex};
const challenge=createPublicScheduleChallenge({...args,nonceHex});
const response={version:1,kind:'bc1q21-professional-schedule-response',
 giftTxid,nonceHex,outputCommitment:challenge.outputCommitment,firstDate:dates[0],interval:'month'};
test('public schedule return verifies context and Bitcoin scripts but not device authentication',()=>{
 const result=verifyPublicScheduleReturn({...args,challenge,response});
 assert.deepEqual(result.schedule.releases.map(r=>r.date),dates);
 assert.equal(result.contextBound,true);
 assert.equal(result.deviceAuthenticated,false);
 assert.equal(result.beneficiaryAuthorized,false);
 assert.equal(result.nonceReplayProtectionProvided,false);
});
test('reject replay across nonce, gift transaction and changed outputs',()=>{
 assert.throws(()=>verifyPublicScheduleReturn({...args,challenge,response:{...response,nonceHex:'02'.repeat(16)}}));
 assert.throws(()=>verifyPublicScheduleReturn({...args,challenge,response:{...response,giftTxid:'cd'.repeat(32)}}));
 assert.throws(()=>verifyPublicScheduleReturn({...args,challenge,response,outputScriptsHex:[...outputScriptsHex].reverse()}));
});
test('reject tampered schedule and unexpected secret-like fields',()=>{
 for(const patch of [{firstDate:'2031-01-16'},{interval:'year'},{seed:'never-accept'}])
  assert.throws(()=>verifyPublicScheduleReturn({...args,challenge,response:{...response,...patch}}));
 assert.throws(()=>createPublicScheduleChallenge({...args,nonceHex:'short'}));
});
