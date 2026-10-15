// bc1q21 Professional ONLY: captured Jade Plus V7 disposable synthetic signing response.
// No network calls, no wallet connection, no broadcast, no real funds.
// Script finalization is NOT equivalent to Bitcoin consensus script execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import { verifySyntheticSignedPsbt } from './verify-synthetic-signed-psbt.mjs';
import { finalizeSyntheticCltvPsbt } from './finalize-synthetic-cltv.mjs';

const signed = Buffer.from('cHNidP8BAFICAAAAAQ0FN7ZgTGHKfVC0WsOm8b9+dnJuOG4Xq6oovfE74YTmAAAAAAD+////AbiCAQAAAAAAFgAUQkJCQkJCQkJCQkJCQkJCQkJCQkJuAAAAAAEAVQIAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////AgEB/////wGghgEAAAAAABepFLF18Kyab+Z8TALu3HOndTpnpOymhwAAAAAiAgMmCFc8leIqwbL7QJTV/Xx5o92K6ssyk+axINyDDe7/vUcwRAIgJ9Th6Pz9XrbNbhX4pizhltqGb2kICTvHMLm4wJ5AWMkCICC1VMoF7ngNKKfBNUdCDrRybKge7GkLLiZhI0zK6AUPAQEEJwFusXUhAyYIVzyV4irBsvtAlNX9fHmj3YrqyzKT5rEg3IMN7v+9rCIGAyYIVzyV4irBsvtAlNX9fHmj3YrqyzKT5rEg3IMN7v+9GOKawTxUAACAAAAAgAAAAIABAAAACgAAAAAA', 'base64');
const expectedPubkey = '032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd';
const sha256 = raw => createHash('sha256').update(raw).digest('hex');
const unsigned = bitcoin.Psbt.fromBuffer(signed);
delete unsigned.data.inputs[0].partialSig;
const original = unsigned.toBase64();

test('captured V7 signed PSBT matches recorded bytes and approved unsigned fixture', () => {
  assert.equal(signed.length, 390);
  assert.equal(sha256(signed), '94f7594277da053fabb3a029c940c189f3aac32b21b23c152bbb4788703dcf96');
  assert.equal(unsigned.toBuffer().length, 283);
  assert.equal(sha256(unsigned.toBuffer()), 'ee120308ac348227d0f249662ed52108c0ca4f183be6baa9517d7caf35818544');
  const verified = verifySyntheticSignedPsbt(signed, original, expectedPubkey);
  assert.equal(verified.signatureCount, 1);
});

test('captured V7 signed PSBT finalizes to expected legacy P2SH CLTV scriptSig without broadcast', () => {
  const result = finalizeSyntheticCltvPsbt(signed, original, expectedPubkey);
  const tx = bitcoin.Transaction.fromHex(result.rawTransactionHex);
  assert.equal(tx.version, 2);
  assert.equal(tx.locktime, 110);
  assert.equal(tx.ins.length, 1);
  assert.equal(tx.outs.length, 1);
  assert.equal(tx.ins[0].sequence, 0xfffffffe);
  assert.equal(tx.ins[0].witness.length, 0);
  assert.equal(tx.outs[0].value, 99000);
  assert.equal(result.broadcast, false);
  assert.equal(result.scriptExecutionVerified, false);
});

test('captured V7 signature tampering is rejected', () => {
  const modified = bitcoin.Psbt.fromBuffer(signed);
  const sig = Buffer.from(modified.data.inputs[0].partialSig[0].signature);
  sig[12] ^= 1;
  modified.data.inputs[0].partialSig[0].signature = sig;
  assert.throws(() => verifySyntheticSignedPsbt(modified.toBuffer(), original, expectedPubkey));
});
