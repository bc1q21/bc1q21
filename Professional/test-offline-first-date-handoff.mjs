import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {validateRecoveryHandoff,syntheticOfflineDecrypt,syntheticFixtureCipher} from './offline-first-date-handoff.mjs';

const password='SYNTHETIC-NOT-A-WALLET-SECRET';
const challenge=randomBytes(16).toString('hex');
const giftCommitment='a4'.repeat(32);
const cipher=await syntheticFixtureCipher('2035-07-19',password);
const received=await syntheticOfflineDecrypt({cipherHex:cipher,password,challenge,giftCommitment});
assert.equal(received.firstReleaseDate,'2035-07-19');
assert.equal(received.network,'regtest');
assert.equal(Object.isFrozen(received),true);
assert.deepEqual(Object.keys(received).sort(),
  ['format','network','result','challenge','giftCommitment','firstReleaseDate'].sort());
for(const key of ['mnemonic','seed','privateKey','xprv','wif','password','encryptionSecret','xpub','redeemScript'])
 assert.ok(!Object.hasOwn(received,key),'Sensitive/unneeded field transmitted: '+key);
for(const changed of [
 {...received,firstReleaseDate:'2035-07-20'},
 {...received,firstReleaseDate:'2035-02-30'},
 {...received,network:'mainnet'},
 {...received,challenge:'b7'.repeat(16)},
 {...received,extraSecret:'should-not-be-here'},
 {...received,result:'wallet-secret'},
 {...received,format:'unsupported'}
]){
  if(changed.firstReleaseDate==='2035-07-20'){
    // A date change is structurally valid. Metadata schema alone cannot
    // authenticate a hostile message; this is an EXPLICIT DESIGN BLOCKER.
    assert.equal(validateRecoveryHandoff(changed,challenge).firstReleaseDate,'2035-07-20');
  } else {
    assert.throws(()=>validateRecoveryHandoff(changed,challenge));
  }
}
await assert.rejects(syntheticOfflineDecrypt({cipherHex:cipher,password:'wrong synthetic string',challenge,giftCommitment}));
const modified=Buffer.from(cipher,'hex');modified[modified.length-1]^=1;
await assert.rejects(syntheticOfflineDecrypt({cipherHex:modified.toString('hex'),password,challenge,giftCommitment}));
console.log('PASS encrypted fictional date decrypted in synthetic offline component with minimal public handoff');
console.log('PASS wrong-password, ciphertext tamper, malformed handoff and extra secret fields rejected');
console.log('SECURITY BLOCKER: challenge and schema do not authenticate provenance; modified valid dates can pass schema checks');
console.log('NOT PROVEN: hardware offline decryption, protected QR transport, binding to real gift, same-word restore');
