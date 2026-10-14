// Synthetic end-to-end public integration of retail AES first-date handling,
// four CLTV outputs, and funding intent verification. No real wallet or signer.
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import {deriveDisposableRetailEncryptionPassphraseOffline} from './disposable-bip39-retail-secret-fixture.mjs';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {createPublicScheduleChallenge,verifyPublicScheduleReturn} from './public-schedule-return.mjs';
import {unlockSyntheticRetailScheduleOffline} from './synthetic-offline-unlock-pipeline.mjs';
import {checkGiftDistributionAgainstSnapshot} from './gift-distribution-snapshot-gate.mjs';

globalThis.crypto ??= webcrypto;
const {encryptShortHex}=await import('../Frontend/AESHelper.js');
const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const fingerprint='e29ac13c',firstDate='2031-01-15',giftTxid='22'.repeat(32);
const dates=['2031-01-15','2031-02-15','2031-03-15','2031-04-15'];
const amounts=[12000,15000,18000,21000],feeScript='0014'+'ab'.repeat(20);
const scripts=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex:fingerprint,childIndex,locktime:retailDateToCltvTimestamp(date)
}).fundingScriptPubKeyHex);
const funding=[{txid:'11'.repeat(32),vout:0,valueSats:66500,scriptPubKeyHex:feeScript}];
function transaction(encryptedHex){
 const tx=new bitcoin.Transaction();tx.addInput(Buffer.from(funding[0].txid,'hex').reverse(),0);
 scripts.forEach((script,i)=>tx.addOutput(Buffer.from(script,'hex'),amounts[i]));
 tx.addOutput(Buffer.from(feeScript,'hex'),400);
 tx.addOutput(bitcoin.script.compile([bitcoin.opcodes.OP_RETURN,Buffer.from(encryptedHex,'hex')]),0);
 return tx.toHex();
}
test('disposable wallet AES date -> four-output gift -> offline unlock -> public schedule verification',async()=>{
 const fixtureSecret=deriveDisposableRetailEncryptionPassphraseOffline();
 const encryptedHex=await encryptShortHex(firstDate,fixtureSecret);
 const envelope={operation:'gift-distribution',network:'regtest',giftReference:giftTxid,
  publicPayload:{giftOutputs:scripts.map((scriptPubKeyHex,i)=>({scriptPubKeyHex,valueSats:amounts[i]})),
   serviceFeeOutput:{scriptPubKeyHex:feeScript,valueSats:400},changeOutput:null,
   minerFeeSats:100,encryptedFirstDateHex:encryptedHex}};
 const result=checkGiftDistributionAgainstSnapshot(envelope,funding,
  [{...funding[0],spent:false,confirmed:true}],transaction(encryptedHex));
 assert.equal(result.outputsMatch,true);
 assert.equal(result.releaseCount,4);
 const challenge=createPublicScheduleChallenge({giftTxid,outputScriptsHex:scripts,nonceHex:'cd'.repeat(16)});
 const response=unlockSyntheticRetailScheduleOffline({encryptedHex,currentPassphrase:fixtureSecret,
  challenge,giftTxid,outputScriptsHex:scripts,interval:'month',approved:true});
 assert.deepEqual(Object.keys(response),['version','kind','giftTxid','nonceHex','outputCommitment','firstDate','interval']);
 assert.equal(response.firstDate,firstDate);
 const verified=verifyPublicScheduleReturn({challenge,response,giftTxid,outputScriptsHex:scripts,
  accountXpub,masterFingerprintHex:fingerprint});
 assert.deepEqual(verified.schedule.releases.map(r=>r.date),dates);
 assert.equal(verified.deviceAuthenticated,false);
 assert.equal(verified.beneficiaryAuthorized,false);
 assert.equal(result.signaturesVerified,false);
});
test('altered ciphertext cannot be accepted as approved gift OP_RETURN',async()=>{
 const fixtureSecret=deriveDisposableRetailEncryptionPassphraseOffline();
 const encryptedHex=await encryptShortHex(firstDate,fixtureSecret);
 const envelope={operation:'gift-distribution',network:'regtest',giftReference:giftTxid,
  publicPayload:{giftOutputs:scripts.map((scriptPubKeyHex,i)=>({scriptPubKeyHex,valueSats:amounts[i]})),
   serviceFeeOutput:{scriptPubKeyHex:feeScript,valueSats:400},changeOutput:null,
   minerFeeSats:100,encryptedFirstDateHex:encryptedHex}};
 const altered=Buffer.from(encryptedHex,'hex');altered[altered.length-1]^=1;
 assert.throws(()=>checkGiftDistributionAgainstSnapshot(envelope,funding,
  [{...funding[0],spent:false,confirmed:true}],transaction(altered.toString('hex'))),/OP_RETURN/);
});
