// Disposable wallet fixture only. The derivation function is intentionally offline-only.
// This test NEVER supplies a real mnemonic, accesses a device, or sends a network request.
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {deriveDisposableRetailEncryptionPassphraseOffline} from './disposable-bip39-retail-secret-fixture.mjs';
import {decryptRetailDateOffline} from './offline-retail-date-decrypt.mjs';

globalThis.crypto ??= webcrypto;
const {encryptShortHex,decryptShortHex} = await import('../Frontend/AESHelper.js');
const firstDate='2031-01-15';

test('fixed disposable wallet-derived secret interoperates with actual retail AES date format',async()=>{
 const fixtureSecret=deriveDisposableRetailEncryptionPassphraseOffline();
 const ciphertext=await encryptShortHex(firstDate,fixtureSecret);
 const bytes=Buffer.from(ciphertext,'hex');
 assert.equal(bytes.subarray(0,8).toString('utf8'),'BC1Q21G1');
 assert.equal(decryptRetailDateOffline({encryptedHex:ciphertext,currentPassphrase:fixtureSecret}),firstDate);
 assert.equal(await decryptShortHex(ciphertext,'unused-legacy',fixtureSecret),firstDate);
 assert.equal(ciphertext.includes(firstDate),false);
});
test('wrong disposable wallet secret and tampered retail ciphertext fail closed',async()=>{
 const fixtureSecret=deriveDisposableRetailEncryptionPassphraseOffline();
 const ciphertext=await encryptShortHex(firstDate,fixtureSecret);
 assert.throws(()=>decryptRetailDateOffline({encryptedHex:ciphertext,currentPassphrase:'wrong-wallet-fixture'}));
 const altered=Buffer.from(ciphertext,'hex');
 altered[altered.length-1]^=1;
 assert.throws(()=>decryptRetailDateOffline({encryptedHex:altered.toString('hex'),currentPassphrase:fixtureSecret}));
});

test('same disposable 12-word wallet-derived key decrypts actual retail hex-encoded OP_RETURN date',async()=>{
 const walletDerivedPassphrase=deriveDisposableRetailEncryptionPassphraseOffline();
 const date='2031-01-15';
 const retailPlaintext=Buffer.from(date,'utf8').toString('hex');
 const encryptedHex=await encryptShortHex(retailPlaintext,walletDerivedPassphrase);
 assert.equal(await decryptShortHex(encryptedHex,'unused-legacy',walletDerivedPassphrase),retailPlaintext);
 assert.equal(decryptRetailDateOffline({
  encryptedHex,currentPassphrase:walletDerivedPassphrase,retailFirstDateHex:true
 }),date);
 assert.throws(()=>decryptRetailDateOffline({
  encryptedHex,currentPassphrase:'wrong-disposable-wallet',retailFirstDateHex:true
 }));
 const altered=Buffer.from(encryptedHex,'hex');
 altered[altered.length-1]^=1;
 assert.throws(()=>decryptRetailDateOffline({
  encryptedHex:altered.toString('hex'),currentPassphrase:walletDerivedPassphrase,
  retailFirstDateHex:true
 }));
});
