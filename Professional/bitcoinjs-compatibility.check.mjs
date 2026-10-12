// Independent compatibility check using bitcoinjs-lib 6.1.7.
// Deliberately NOT named *.test.mjs: run only after installing the test-only library.
// node --test Professional/bitcoinjs-compatibility.check.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import { buildUnsignedCltvPsbt } from './unsigned-cltv-psbt.mjs';

const hash = (alg, b) => createHash(alg).update(b).digest();
const sha256d = (b) => hash('sha256', hash('sha256', b));
const pubkey = Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd', 'hex');
const redeem = Buffer.concat([Buffer.from([1, 110, 0xb1, 0x75, 33]), pubkey, Buffer.from([0xac])]);
const p2sh = Buffer.concat([Buffer.from([0xa9, 20]), hash('ripemd160', hash('sha256', redeem)), Buffer.from([0x87])]);
const le32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const le64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const funding = Buffer.concat([
  le32(2), Buffer.from([1]), Buffer.alloc(32, 1), le32(0),
  Buffer.from([0]), le32(0xffffffff), Buffer.from([1]), le64(100000),
  Buffer.from([p2sh.length]), p2sh, le32(0)
]);
const txid = Buffer.from(sha256d(funding)).reverse().toString('hex');
const destinationScript = Buffer.from('0014' + 'ab'.repeat(20), 'hex');
test('bitcoinjs-lib independently parses Professional unsigned legacy CLTV PSBT v0', () => {
  const result = buildUnsignedCltvPsbt({
    fundingTxHex: funding.toString('hex'), vout: 0, expectedTxid: txid, expectedSats: 100000,
    redeemScriptHex: redeem.toString('hex'), signerPubkeyHex: pubkey.toString('hex'),
    masterFingerprintHex: 'e29ac13c',
    derivationPath: [0x80000054, 0x80000000, 0x80000000, 1, 10],
    locktime: 110, destinationScriptHex: destinationScript.toString('hex'), destinationSats: 99000
  });
  const psbt = bitcoin.Psbt.fromBase64(result.psbtBase64);
  assert.equal(psbt.version, 2);
  assert.equal(psbt.locktime, 110);
  assert.equal(psbt.txInputs.length, 1);
  assert.equal(psbt.txOutputs.length, 1);
  assert.equal(psbt.txInputs[0].hash.toString('hex'), Buffer.from(txid, 'hex').reverse().toString('hex'));
  assert.equal(psbt.txInputs[0].index, 0);
  assert.equal(psbt.txInputs[0].sequence, 0xfffffffe);
  assert.equal(psbt.txOutputs[0].value, 99000);
  assert.ok(psbt.txOutputs[0].script.equals(destinationScript));
  assert.ok(psbt.data.inputs[0].nonWitnessUtxo.equals(funding));
  assert.ok(psbt.data.inputs[0].redeemScript.equals(redeem));
  assert.equal(psbt.data.inputs[0].bip32Derivation.length, 1);
  assert.ok(psbt.data.inputs[0].bip32Derivation[0].pubkey.equals(pubkey));
  assert.equal(psbt.data.inputs[0].bip32Derivation[0].masterFingerprint.toString('hex'), 'e29ac13c');
  assert.equal(psbt.data.inputs[0].bip32Derivation[0].path, "m/84'/0'/0'/1/10");
  assert.equal(psbt.data.inputs[0].partialSig, undefined);
  assert.equal(psbt.data.inputs[0].finalScriptSig, undefined);
  assert.equal(psbt.toBase64(), result.psbtBase64);
});
