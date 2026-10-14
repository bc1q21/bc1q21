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
