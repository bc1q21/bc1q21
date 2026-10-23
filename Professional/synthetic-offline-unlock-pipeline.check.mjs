import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv,pbkdf2Sync } from 'node:crypto';
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
