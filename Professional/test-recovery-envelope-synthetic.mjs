// Isolated bc1q21 Professional recovery-envelope experiment.
// Synthetic key only. This does NOT integrate with Jade or retail gifts.
import assert from 'node:assert/strict';
import { createHash, createHmac, hkdfSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const enc = x => Buffer.from(JSON.stringify(x), 'utf8');
const hex = b => Buffer.from(b).toString('hex');
const sha256 = b => createHash('sha256').update(b).digest();
const v = 'bc1q21-professional-recovery-experiment-v1';
const context = 'bc1q21-pro-recovery-aes-256-gcm-v1';
const SECRET = randomBytes(32); // Disposable synthetic key, NEVER a BIP32 key.
const assertHex = (s, len) => { assert.match(s, /^[a-f0-9]+$/); assert.equal(s.length, len * 2); return Buffer.from(s, 'hex'); };
function syntheticSchedule(count) {
  assert.ok([1, 4, 24].includes(count));
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(2031, i, 1)).toISOString().slice(0, 10);
    return { index: i, date: d, amountSats: 10_000 + i * 1000, derivationPath: "m/84'/0'/0'/1/" + i };
  });
}
function validateSchedule(s) {
  assert.ok(Array.isArray(s) && s.length >= 1 && s.length <= 24, 'Invalid release count');
  let previous = '';
  for (const [i, r] of s.entries()) {
    assert.deepEqual(Object.keys(r), ['index', 'date', 'amountSats', 'derivationPath'], 'Unexpected schedule schema');
    assert.equal(r.index, i);
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(r.date + 'T00:00:00Z').toISOString().slice(0, 10), r.date);
    assert.ok(r.date > previous, 'Schedule dates must increase');
    previous = r.date;
    assert.ok(Number.isSafeInteger(r.amountSats) && r.amountSats > 0);
    assert.equal(r.derivationPath, "m/84'/0'/0'/1/" + i);
  }
}
function seal(schedule, secret) {
  validateSchedule(schedule);
  const salt = randomBytes(16), nonce = randomBytes(12), commitmentSalt = randomBytes(16);
  const commitment = sha256(Buffer.concat([Buffer.from(v), commitmentSalt, enc(schedule)]));
  const publicMetadata = {
    version: v, network: 'regtest', count: schedule.length,
    commitmentSalt: hex(commitmentSalt), commitment: hex(commitment),
    kdfSalt: hex(salt), nonce: hex(nonce)
  };
  const aad = enc(publicMetadata);
  const key = Buffer.from(hkdfSync('sha256', secret, salt, Buffer.from(context), 32));
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(enc(schedule)), cipher.final()]);
  const tag = cipher.getAuthTag();
  key.fill(0);
  return { ...publicMetadata, ciphertext: hex(ciphertext), tag: hex(tag) };
}
function recover(record, secret) {
  assert.deepEqual(Object.keys(record), [
    'version','network','count','commitmentSalt','commitment','kdfSalt','nonce','ciphertext','tag'
  ], 'Unexpected recovery envelope fields');
  assert.equal(record.version, v, 'Unsupported version');
  assert.equal(record.network, 'regtest', 'Not a regtest fixture');
  assert.ok(Number.isInteger(record.count) && record.count >= 1 && record.count <= 24);
  const commitmentSalt = assertHex(record.commitmentSalt, 16);
  const expected = assertHex(record.commitment, 32);
  const salt = assertHex(record.kdfSalt, 16), nonce = assertHex(record.nonce, 12);
  const tag = assertHex(record.tag, 16);
  const encrypted = assertHex(record.ciphertext, record.ciphertext.length / 2);
  const metadata = {
    version: record.version, network: record.network, count: record.count,
    commitmentSalt: record.commitmentSalt, commitment: record.commitment,
    kdfSalt: record.kdfSalt, nonce: record.nonce
  };
  const key = Buffer.from(hkdfSync('sha256', secret, salt, Buffer.from(context), 32));
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(enc(metadata)); decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const schedule = JSON.parse(plain.toString('utf8'));
    validateSchedule(schedule);
    assert.equal(schedule.length, record.count);
    assert.deepEqual(sha256(Buffer.concat([Buffer.from(v), commitmentSalt, enc(schedule)])), expected, 'Schedule commitment mismatch');
    return schedule;
  } finally { key.fill(0); }
}
const bad = f => { assert.throws(f); };
for (const count of [1,4,24]) {
  const schedule = syntheticSchedule(count);
  const envelope = seal(schedule, SECRET);
  assert.deepEqual(recover(envelope, SECRET), schedule);
  bad(() => recover(envelope, randomBytes(32))); // Different device secret
  for (const field of ['commitment','commitmentSalt','nonce','kdfSalt','ciphertext','tag']) {
    const changed = { ...envelope };
    changed[field] = (changed[field][0] === '0' ? '1' : '0') + changed[field].slice(1);
    bad(() => recover(changed, SECRET));
  }
  bad(() => recover({ ...envelope, network: 'mainnet' }, SECRET));
  bad(() => recover({ ...envelope, version: 'other' }, SECRET));
  bad(() => recover({ ...envelope, count: count + 1 }, SECRET));
  bad(() => recover({ ...envelope, ciphertext: '' }, SECRET));
  console.log('PASS synthetic offline schedule roundtrip and fail-closed cases:', count, 'releases');
}
const four = syntheticSchedule(4);
const envelope = seal(four, SECRET);
const altered = structuredClone(four); altered[0].amountSats += 1;
assert.notDeepEqual(sha256(enc(altered)), sha256(enc(four)));
bad(() => validateSchedule([...four].reverse()));
assert.ok(!Object.keys(envelope).some(k=>/seed|private|mnemonic|xprv|secret/i.test(k)), 'Envelope includes forbidden secret fields');
console.log('PASS public-only envelope schema; no recovery secret exported or printed');
console.log('NOT PROVEN: Jade key derivation, actual device loss restoration, true air-gap workflow, retail compatibility, chain publishing.');
SECRET.fill(0);
