import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv,pbkdf2Sync } from 'node:crypto';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DurablePublicScheduleGate } from './durable-public-schedule-gate.mjs';
import { FileDurableNonceStore } from './file-durable-nonce-store.mjs';
import { createPublicScheduleChallenge,verifyPublicScheduleReturn } from './public-schedule-return.mjs';
import { unlockSyntheticRetailScheduleOffline } from './synthetic-offline-unlock-pipeline.mjs';
import { deriveJadePublicCltvHandoff } from './jade-xpub-cltv-handoff.mjs';
import { retailDateToCltvTimestamp } from './retail-calendar-cltv.mjs';

const currentPassphrase='synthetic-fixture-only-not-a-wallet-secret',firstDate='2031-01-15';
const giftTxid='ab'.repeat(32),masterFingerprintHex='e29ac13c';
const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const dates=['2031-01-15','2031-02-15'];
const outputScriptsHex=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}).fundingScriptPubKeyHex);
const challenge=createPublicScheduleChallenge({giftTxid,outputScriptsHex,nonceHex:'cd'.repeat(16)});
function encryptFixture(){
 const header=Buffer.from('BC1Q21G1'),salt=Buffer.alloc(16,1),iv=Buffer.alloc(12,2);
 const key=pbkdf2Sync(currentPassphrase,salt,100000,32,'sha256');
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(header);
 return Buffer.concat([header,salt,iv,cipher.update(firstDate,'utf8'),cipher.final(),cipher.getAuthTag()]).toString('hex');
}
const args={encryptedHex:encryptFixture(),currentPassphrase,challenge,giftTxid,outputScriptsHex,
 interval:'month',approved:true};
test('synthetic offline AES decrypt -> public response -> online output verification',()=>{
 const response=unlockSyntheticRetailScheduleOffline(args);
 assert.deepEqual(Object.keys(response),['version','kind','giftTxid','nonceHex','outputCommitment','firstDate','interval']);
 assert.equal(response.firstDate,firstDate);
 const verified=verifyPublicScheduleReturn({challenge,response,giftTxid,outputScriptsHex,
  accountXpub,masterFingerprintHex});
 assert.deepEqual(verified.schedule.releases.map(r=>r.date),dates);
 assert.equal(verified.deviceAuthenticated,false);
});
test('offline refusal and incorrect decryption secret emit no response',()=>{
 assert.throws(()=>unlockSyntheticRetailScheduleOffline({...args,approved:false}));
 assert.throws(()=>unlockSyntheticRetailScheduleOffline({...args,currentPassphrase:'incorrect'}));
});

test('offline schedule pipeline handles retail hex first date without exposing passphrase',()=>{
 const plaintext=Buffer.from(firstDate,'utf8').toString('hex');
 const header=Buffer.from('BC1Q21G1'),salt=Buffer.alloc(16,3),iv=Buffer.alloc(12,4);
 const key=pbkdf2Sync(currentPassphrase,salt,100000,32,'sha256');
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(header);
 const encryptedHex=Buffer.concat([header,salt,iv,cipher.update(plaintext,'utf8'),
  cipher.final(),cipher.getAuthTag()]).toString('hex');
 const response=unlockSyntheticRetailScheduleOffline({...args,encryptedHex,retailFirstDateHex:true});
 assert.equal(response.firstDate,firstDate);
 assert.equal(JSON.stringify(response).includes(currentPassphrase),false);
 assert.deepEqual(verifyPublicScheduleReturn({challenge,response,giftTxid,outputScriptsHex,
  accountXpub,masterFingerprintHex}).schedule.releases.map(x=>x.date),dates);
 assert.throws(()=>unlockSyntheticRetailScheduleOffline({...args,encryptedHex,
  retailFirstDateHex:true,currentPassphrase:'incorrect'}));
});

test('actual offline hex-date schedule response is gift-bound and cannot replay after restart',async()=>{
 const plaintext=Buffer.from(firstDate,'utf8').toString('hex');
 const header=Buffer.from('BC1Q21G1'),salt=Buffer.alloc(16,5),iv=Buffer.alloc(12,6);
 const key=pbkdf2Sync(currentPassphrase,salt,100000,32,'sha256');
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(header);
 const encryptedHex=Buffer.concat([header,salt,iv,cipher.update(plaintext,'utf8'),
  cipher.final(),cipher.getAuthTag()]).toString('hex');
 const response=unlockSyntheticRetailScheduleOffline({...args,encryptedHex,retailFirstDateHex:true});
 const directory=await mkdtemp(join(tmpdir(),'professional-retail-date-replay-'));
 try{
  const gate=()=>new DurablePublicScheduleGate({store:new FileDurableNonceStore({directory})});
  const inputs={challenge,response,giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex};
  await assert.rejects(()=>gate().complete({...inputs,giftTxid:'ef'.repeat(32)}),
   /not bound to the requested gift/);
  await assert.rejects(()=>gate().complete(inputs),/already consumed/);
  const newChallenge=createPublicScheduleChallenge({giftTxid,outputScriptsHex,
   nonceHex:'de'.repeat(16)});
  const newResponse=unlockSyntheticRetailScheduleOffline({...args,encryptedHex,
   retailFirstDateHex:true,challenge:newChallenge});
  const fresh={...inputs,challenge:newChallenge,response:newResponse};
  const accepted=await gate().complete(fresh);
  assert.deepEqual(accepted.schedule.releases.map(x=>x.date),dates);
  assert.equal(accepted.nonceClaimedDurablyByStore,true);
  assert.equal(accepted.deviceAuthenticated,false);
  await assert.rejects(()=>gate().complete(fresh),/already consumed/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
