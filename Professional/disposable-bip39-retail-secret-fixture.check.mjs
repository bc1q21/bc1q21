import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv,pbkdf2Sync } from 'node:crypto';
import { deriveDisposableRetailEncryptionPassphraseOffline } from './disposable-bip39-retail-secret-fixture.mjs';
import { decryptRetailDateOffline } from './offline-retail-date-decrypt.mjs';

test('fixed public BIP39 vector derives deterministic retail-compatible passphrase',()=>{
 const a=deriveDisposableRetailEncryptionPassphraseOffline();
 const b=deriveDisposableRetailEncryptionPassphraseOffline();
 assert.match(a,/^[a-f0-9]{64}$/);
 assert.equal(a,b);
});
test('fixed BIP39 fixture secret decrypts current retail AES-GCM date',()=>{
 const passphrase=deriveDisposableRetailEncryptionPassphraseOffline();
 const header=Buffer.from('BC1Q21G1'),salt=Buffer.alloc(16,7),iv=Buffer.alloc(12,9);
 const key=pbkdf2Sync(passphrase,salt,100000,32,'sha256');
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(header);
 const encryptedHex=Buffer.concat([header,salt,iv,cipher.update('2032-07-04','utf8'),
  cipher.final(),cipher.getAuthTag()]).toString('hex');
 assert.equal(decryptRetailDateOffline({encryptedHex,currentPassphrase:passphrase}),'2032-07-04');
 assert.throws(()=>decryptRetailDateOffline({encryptedHex,currentPassphrase:'wrong'}));
});
