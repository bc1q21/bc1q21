// Offline synthetic-only regression tests. Run: node --test Professional/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildUnsignedCltvPsbt } from './unsigned-cltv-psbt.mjs';

const h = (a, b) => createHash(a).update(b).digest();
const dsha = (b) => h('sha256', h('sha256', b));
const hash160 = (b) => h('ripemd160', h('sha256', b));
const le32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const le64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const pub = Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd', 'hex');
const redeem = Buffer.concat([Buffer.from([1, 110, 0xb1, 0x75, 33]), pub, Buffer.from([0xac])]);
const p2sh = Buffer.concat([Buffer.from([0xa9, 20]), hash160(redeem), Buffer.from([0x87])]);
const funding = Buffer.concat([
  le32(2), Buffer.from([1]), Buffer.alloc(32, 1), le32(0), Buffer.from([0]),
  le32(0xffffffff), Buffer.from([1]), le64(100000),
  Buffer.from([p2sh.length]), p2sh, le32(0)
]);
const txid = Buffer.from(dsha(funding)).reverse().toString('hex');
const destination = '0014' + 'ab'.repeat(20);
const fixture = () => ({
  fundingTxHex: funding.toString('hex'), expectedTxid: txid, vout: 0, expectedSats: 100000,
  redeemScriptHex: redeem.toString('hex'), signerPubkeyHex: pub.toString('hex'),
  masterFingerprintHex: 'e29ac13c', derivationPath: [0x80000054, 0x80000000, 0x80000000, 1, 10],
  locktime: 110, destinationScriptHex: destination, destinationSats: 99000
});
function fails(patch, message) {
  assert.throws(() => buildUnsignedCltvPsbt({ ...fixture(), ...patch }), message);
}
test('deterministic unsigned PSBT v0 contains expected maps and transaction summary', () => {
  const a = buildUnsignedCltvPsbt(fixture());
  const b = buildUnsignedCltvPsbt(fixture());
  assert.equal(a.psbtHex, b.psbtHex);
  const psbt = Buffer.from(a.psbtBase64, 'base64');
  assert.equal(psbt.subarray(0, 5).toString('hex'), '70736274ff');
  assert.equal(psbt.toString('hex'), a.psbtHex);
  assert.equal(a.summary.feeSats, 1000);
  assert.equal(a.summary.locktime, 110);
  assert.equal(a.summary.txid, txid);
  assert.ok(psbt.includes(redeem));
  assert.ok(psbt.includes(funding));
  assert.ok(psbt.includes(pub));
  assert.ok(psbt.includes(Buffer.from('e29ac13c', 'hex')));
});
test('reject incorrect txid', () => fails({ expectedTxid: '00'.repeat(32) }, /txid mismatch/));
test('reject incorrect prevout amount', () => fails({ expectedSats: 100001 }, /amount mismatch/));
test('reject incorrect prevout index', () => fails({ vout: 1 }, /index out of range/));
test('reject incorrect redeemScript', () => fails({ redeemScriptHex: redeem.toString('hex').replace('6eb175', '6fb175') }, /does not match/));
test('reject signer mismatch', () => fails({ signerPubkeyHex: '02' + pub.toString('hex').slice(2) }, /public key mismatch/));
test('reject locktime below CLTV', () => fails({ locktime: 109 }, /does not satisfy CLTV/));
test('reject locktime type mismatch', () => fails({ locktime: 500000000 }, /does not satisfy CLTV/));
test('reject final input sequence', () => fails({ sequence: 0xffffffff }, /non-final sequence/));
test('reject invalid destination', () => fails({ destinationScriptHex: '6a00' }, /Unsupported destination/));
test('reject fee underflow', () => fails({ destinationSats: 100001 }, /Invalid payout/));
test('reject excessive fee', () => fails({ destinationSats: 500 }, /Invalid payout/));
test('reject malformed amounts', () => fails({ destinationSats: 99000.5 }, /Invalid destinationSats/));
test('reject malformed funding tx', () => fails({ fundingTxHex: '00' }, /Invalid funding transaction size/));
test('reject truncated funding tx', () => fails({ fundingTxHex: funding.subarray(0, -3).toString('hex') }, /Truncated transaction/));
test('reject tampered funding tx bytes', () => {
  const bad = Buffer.from(funding);
  bad[5] ^= 1;
  fails({ fundingTxHex: bad.toString('hex') }, /txid mismatch/);
});
test('reject malformed fingerprint and derivation path', () => {
  fails({ masterFingerprintHex: 'abcd' }, /Wrong length/);
  fails({ derivationPath: [0x100000000] }, /Invalid BIP32 path element/);
});
