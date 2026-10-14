import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { decryptRetailDateOffline } from './offline-retail-date-decrypt.mjs';

// Directly import the actual retail implementation from this isolated branch.
// All values below are disposable synthetic test strings, not wallet secrets.
globalThis.crypto ??= webcrypto;
const { encryptShortHex, decryptShortHex } = await import('../Frontend/AESHelper.js');
const date = '2032-11-23';
const syntheticPassphrase = 'synthetic-offline-interoperability-fixture';
test('actual retail AES-GCM encrypt -> isolated offline decrypt', async () => {
  const encryptedHex = await encryptShortHex(date, syntheticPassphrase);
  assert.equal(decryptRetailDateOffline({ encryptedHex, currentPassphrase: syntheticPassphrase }), date);
  assert.equal(await decryptShortHex(encryptedHex, 'unused-legacy', syntheticPassphrase), date);
});
test('wrong offline passphrase cannot decrypt actual retail ciphertext', async () => {
  const encryptedHex = await encryptShortHex(date, syntheticPassphrase);
  assert.throws(() => decryptRetailDateOffline({ encryptedHex, currentPassphrase: 'wrong' }));
});
