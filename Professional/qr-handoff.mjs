// bc1q21 Professional: guarded, unsigned PSBT handoff to a future UR:CRYPTO-PSBT encoder.
// This module deliberately DOES NOT encode animated QR frames or invoke hardware.
// bitcoinjs-lib is a test-only dependency at this stage; no retail integration.
import bitcoin from 'bitcoinjs-lib';

const reject = (message) => { throw new Error(message); };
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));
const canonical = (b64) => {
  if (typeof b64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4)
    reject('Invalid base64 PSBT');
  const bytes = Buffer.from(b64, 'base64');
  if (bytes.toString('base64') !== b64 || bytes.length > 100000) reject('Invalid or oversized PSBT');
  return bytes;
};

/**
 * Returns validated raw PSBT bytes to be wrapped by a separate, vetted
 * BC-UR crypto-psbt encoder. It does NOT produce a Jade-compatible QR itself.
 * expected is the immutable transaction summary from the unsigned builder.
 */
export function prepareUnsignedPsbtForQr(psbtBase64, expected) {
  const bytes = canonical(psbtBase64);
  if (bytes.subarray(0, 5).toString('hex') !== '70736274ff') reject('Not PSBT v0');
  if (!expected || typeof expected !== 'object') reject('Expected transaction summary required');
  let psbt;
  try { psbt = bitcoin.Psbt.fromBuffer(bytes); }
  catch { reject('PSBT cannot be decoded'); }
  if (psbt.txInputs.length !== 1 || psbt.txOutputs.length !== 1)
    reject('Only one input and one output are supported');
  const inp = psbt.txInputs[0], out = psbt.txOutputs[0], meta = psbt.data.inputs[0];
  if (meta.partialSig?.length || meta.finalScriptSig || meta.finalScriptWitness || meta.tapKeySig)
    reject('Signed or finalized PSBT cannot enter unsigned QR handoff');
  if (psbt.version !== 2 || psbt.locktime !== expected.locktime ||
      inp.sequence !== expected.sequence || inp.index !== expected.vout ||
      Buffer.from(inp.hash).reverse().toString('hex') !== expected.txid)
    reject('PSBT input or time-lock mismatch');
  if (out.value !== expected.payoutSats ||
      out.script.toString('hex') !== expected.destinationScriptHex)
    reject('PSBT destination or payout mismatch');
  if (!meta.nonWitnessUtxo || !meta.redeemScript || !meta.bip32Derivation ||
      meta.bip32Derivation.length !== 1)
    reject('Legacy CLTV signing metadata missing');
  const prev = bitcoin.Transaction.fromBuffer(meta.nonWitnessUtxo);
  if (prev.getId() !== expected.txid || !prev.outs[expected.vout])
    reject('Funding transaction mismatch');
  if (prev.outs[expected.vout].value !== expected.inputSats ||
      prev.outs[expected.vout].value - out.value !== expected.feeSats)
    reject('Input amount or fee mismatch');
  if (meta.bip32Derivation[0].pubkey.toString('hex') !== expected.signerPubkeyHex)
    reject('Signing public key mismatch');
  return { psbtBytes: Buffer.from(bytes), byteLength: bytes.length, format: 'psbt-v0',
    nextEncoder: 'ur:crypto-psbt', transactionSummary: Object.freeze({ ...expected }) };
}
