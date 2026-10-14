import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveJadePublicCltvHandoff } from './jade-xpub-cltv-handoff.mjs';
import { retailDateToCltvTimestamp } from './retail-calendar-cltv.mjs';
import { PublicScheduleSessionGate } from './public-schedule-session-gate.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c',giftTxid='ab'.repeat(32);
const dates=['2031-01-15','2031-02-15'];
const outputScriptsHex=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}).fundingScriptPubKeyHex);
const args={giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex};
function responseFor(challenge){return {version:1,kind:'bc1q21-professional-schedule-response',
 giftTxid,nonceHex:challenge.nonceHex,outputCommitment:challenge.outputCommitment,
 firstDate:dates[0],interval:'month'};}
test('single-use session gate accepts one verified return, rejects second use',()=>{
 const gate=new PublicScheduleSessionGate();
 const challenge=gate.begin({...args,nonceHex:'11'.repeat(16)});
 const response=responseFor(challenge);
 const result=gate.complete({...args,challenge,response});
 assert.equal(result.sessionChallengeConsumed,true);
 assert.equal(result.durableReplayProtection,false);
 assert.equal(result.deviceAuthenticated,false);
 assert.equal(result.beneficiaryAuthorized,false);
 assert.throws(()=>gate.complete({...args,challenge,response}),/already consumed/);
 assert.throws(()=>gate.begin({...args,nonceHex:challenge.nonceHex}),/already used/);
});
test('bad response consumes nonce and prevents retry with corrected response',()=>{
 const gate=new PublicScheduleSessionGate();
 const challenge=gate.begin({...args,nonceHex:'22'.repeat(16)});
 const response=responseFor(challenge);
 assert.throws(()=>gate.complete({...args,challenge,response:{...response,firstDate:'2031-01-16'}}));
 assert.throws(()=>gate.complete({...args,challenge,response}),/already consumed/);
});
test('cancel and pending limits reject replay and unbounded sessions',()=>{
 const gate=new PublicScheduleSessionGate({maxPending:1});
 const challenge=gate.begin({...args,nonceHex:'33'.repeat(16)});
 assert.throws(()=>gate.begin({...args,nonceHex:'44'.repeat(16)}),/Too many pending/);
 assert.equal(gate.cancel(challenge.nonceHex),true);
 assert.equal(gate.cancel(challenge.nonceHex),false);
 assert.throws(()=>gate.complete({...args,challenge,response:responseFor(challenge)}),/already consumed/);
});
