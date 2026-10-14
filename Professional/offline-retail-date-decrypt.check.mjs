import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createCipheriv, pbkdf2Sync } from 'node:crypto';
import { decryptRetailDateOffline } from './offline-retail-date-decrypt.mjs';

const date = '2031-04-19';
const currentPassphrase = 'disposable-test-passphrase-not-a-wallet-secret';
const legacyPassphrase = 'bc1q-test-address-fixture-not-a-real-address';
function currentFixture() {
  const header = Buffer.from('BC1Q21G1');
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = pbkdf2Sync(currentPassphrase, salt, 100000, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(header);
  const ciphertext = Buffer.concat([cipher.update(date, 'utf8'), cipher.final()]);
  return Buffer.concat([header, salt, iv, ciphertext, cipher.getAuthTag()]).toString('hex');
}
function legacyFixture() {
  const salt = randomBytes(8);
  const derived = pbkdf2Sync(legacyPassphrase, salt, 1, 48, 'sha256');
  const cipher = createCipheriv('aes-256-cbc', derived.subarray(0, 32), derived.subarray(32, 48));
  const ciphertext = Buffer.concat([cipher.update(date, 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from('Salted__'), salt, ciphertext]).toString('hex');
}
test('decrypt current retail BC1Q21G1 date with offline synthetic passphrase', () => {
  const encryptedHex = currentFixture();
  assert.equal(decryptRetailDateOffline({encryptedHex,currentPassphrase}),date);
  assert.throws(()=>decryptRetailDateOffline({encryptedHex,currentPassphrase:'wrong'}));
  const altered = Buffer.from(encryptedHex,'hex'); altered[altered.length-1] ^= 1;
  assert.throws(()=>decryptRetailDateOffline({encryptedHex:altered.toString('hex'),currentPassphrase}));
});
test('decrypt legacy Salted__ date with offline synthetic passphrase', () => {
  const encryptedHex = legacyFixture();
  assert.equal(decryptRetailDateOffline({encryptedHex,legacyPassphrase}),date);
  assert.throws(()=>decryptRetailDateOffline({encryptedHex,legacyPassphrase:'wrong'}));
});
test('reject unknown, truncated, or invalid ciphertext', () => {
  for (const encryptedHex of ['', 'zz', '00', Buffer.from('NOTGIFT!').toString('hex')])
    assert.throws(()=>decryptRetailDateOffline({encryptedHex,currentPassphrase,legacyPassphrase}));
});
