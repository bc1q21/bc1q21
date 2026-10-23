// Cross-check offline Professional date recovery against the unchanged retail
// encryption implementation. Synthetic passphrase only; no seed, xprv, Jade,
// wallet-derived key, signing, broadcast, or network activity.
import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptShortHex,decryptShortHex} from '../Frontend/AESHelper.js';
import {decryptRetailDateOffline} from './offline-retail-date-decrypt.mjs';

test('retail-generated BC1Q21G1 dates decrypt identically in isolated offline recovery',async()=>{
 const passphrase='synthetic-professional-retail-compatibility-only';
 for(const date of ['2028-02-29','2030-01-01','2040-12-31']){
  const ciphertext=await encryptShortHex(date,passphrase);
  assert.ok(ciphertext.startsWith(Buffer.from('BC1Q21G1').toString('hex')));
  assert.equal(await decryptShortHex(ciphertext,passphrase,passphrase),date);
  assert.equal(decryptRetailDateOffline({encryptedHex:ciphertext,currentPassphrase:passphrase}),date);
  assert.throws(()=>decryptRetailDateOffline({encryptedHex:ciphertext,
   currentPassphrase:passphrase+'-incorrect'}));
  const corrupted=Buffer.from(ciphertext,'hex');
  corrupted[corrupted.length-1]^=1;
  assert.throws(()=>decryptRetailDateOffline({encryptedHex:corrupted.toString('hex'),
   currentPassphrase:passphrase}));
 }
});

test('offline date recovery rejects invalid retail calendar values',async()=>{
 const passphrase='synthetic-professional-invalid-calendar-only';
 for(const invalid of ['2027-02-29','2030-13-01','2030-01-32','not-a-date']){
  const ciphertext=await encryptShortHex(invalid,passphrase);
  assert.equal(await decryptShortHex(ciphertext,passphrase,passphrase),invalid);
  assert.throws(()=>decryptRetailDateOffline({encryptedHex:ciphertext,
   currentPassphrase:passphrase}),/Invalid decrypted release date/);
 }
});
