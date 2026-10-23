// Offline-only interoperability fixture for the current retail encrypted date format.
// Uses synthetic disposable passphrases, NOT a wallet seed, xprv, or hardware secret.
// This module does not connect to networks, sign, broadcast, or expose any private wallet material.
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';

const header = Buffer.from('BC1Q21G1', 'utf8');
const legacyHeader = Buffer.from('Salted__', 'utf8');
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function bytesFromHex(value) {
  if (typeof value !== 'string' || value.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(value))
    throw new Error('Invalid encrypted hex');
  return Buffer.from(value, 'hex');
}
function validateDate(plain) {
  if (!datePattern.test(plain) || Number.isNaN(Date.parse(plain + 'T00:00:00Z')) ||
      new Date(plain + 'T00:00:00Z').toISOString().slice(0, 10) !== plain)
    throw new Error('Invalid decrypted release date');
  return plain;
}
export function decryptRetailDateOffline({ encryptedHex, currentPassphrase, legacyPassphrase, retailFirstDateHex = false }) {
  const decodeDate = plain => {
    if (!retailFirstDateHex) return validateDate(plain);
    if (!/^(?:[0-9a-f]{2}){10}$/.test(plain)) throw new Error('Invalid retail first-date hex');
    return validateDate(Buffer.from(plain, 'hex').toString('utf8'));
  };
  const blob = bytesFromHex(encryptedHex);
  if (blob.length < 8) throw new Error('Encrypted data too short');
  if (blob.subarray(0, 8).equals(header)) {
    if (blob.length < 8 + 16 + 12 + 16) throw new Error('Encrypted data too short');
    if (typeof currentPassphrase !== 'string' || !currentPassphrase) throw new Error('Missing offline decryption passphrase');
    const salt = blob.subarray(8, 24);
    const iv = blob.subarray(24, 36);
    const ciphertext = blob.subarray(36, -16);
    const tag = blob.subarray(-16);
    const key = pbkdf2Sync(Buffer.from(currentPassphrase, 'utf8'), salt, 100000, 32, 'sha256');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(header);
    decipher.setAuthTag(tag);
    return decodeDate(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'));
  }
  if (blob.subarray(0, 8).equals(legacyHeader)) {
    if (blob.length < 32 || (blob.length - 16) % 16 !== 0) throw new Error('Invalid legacy ciphertext');
    if (typeof legacyPassphrase !== 'string' || !legacyPassphrase) throw new Error('Missing legacy passphrase');
    const derived = pbkdf2Sync(Buffer.from(legacyPassphrase, 'utf8'), blob.subarray(8, 16), 1, 48, 'sha256');
    const decipher = createDecipheriv('aes-256-cbc', derived.subarray(0, 32), derived.subarray(32, 48));
    return decodeDate(Buffer.concat([decipher.update(blob.subarray(16)), decipher.final()]).toString('utf8'));
  }
  throw new Error('Unknown encrypted data format');
}
