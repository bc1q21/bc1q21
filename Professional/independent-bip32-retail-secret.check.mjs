import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync, createHash } from 'node:crypto';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { deriveDisposableRetailEncryptionPassphraseOffline } from './disposable-bip39-retail-secret-fixture.mjs';

// Independent BIP32 implementation and fixed, widely published BIP39 test words.
// No real seed words, network operations, or Bitcoin transactions.
const publicTestMnemonic='abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
test('independent bip32 library reproduces disposable retail child-derived AES secret',()=>{
 const seed=pbkdf2Sync(publicTestMnemonic,'mnemonic',2048,64,'sha512');
 const bip32=BIP32Factory(ecc);
 const child=bip32.fromSeed(seed).derivePath("m/84'/0'/0'/0/2");
 assert.ok(child.privateKey);
 const expected=createHash('sha256').update(Buffer.concat([
  Buffer.from(child.privateKey),Buffer.from('bc1q21-opreturn-encryption-v1','utf8')
 ])).digest('hex');
 assert.equal(deriveDisposableRetailEncryptionPassphraseOffline(),expected);
 seed.fill(0);
});
