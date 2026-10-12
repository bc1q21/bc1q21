// Isolated synthetic CLTV signed-PSBT verification. No signing, finalization or broadcast.
import bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { Buffer } from 'buffer';

export function verifySyntheticSignedPsbt(raw, expectedBase64, expectedPubkeyHex) {
  const signed = bitcoin.Psbt.fromBuffer(Buffer.from(raw));
  const original = bitcoin.Psbt.fromBase64(expectedBase64);
  if (signed.txInputs.length !== 1 || signed.txOutputs.length !== 1)
    throw Error('Unexpected transaction input/output count');
  if (!Buffer.from(signed.data.globalMap.unsignedTx.toBuffer()).equals(Buffer.from(original.data.globalMap.unsignedTx.toBuffer())))
    throw Error('Unsigned transaction changed');
  const input = signed.data.inputs[0], base = original.data.inputs[0];
  for (const field of ['nonWitnessUtxo', 'redeemScript']) {
    if (!input[field] || !Buffer.from(input[field]).equals(Buffer.from(base[field])))
      throw Error(field + ' changed or missing');
  }
  if (input.witnessUtxo || input.finalScriptSig || input.finalScriptWitness || input.witnessScript)
    throw Error('Unexpected witness or finalized input');
  if (input.sighashType !== undefined && input.sighashType !== bitcoin.Transaction.SIGHASH_ALL)
    throw Error('Unexpected sighashType');
  if (input.bip32Derivation && (
    input.bip32Derivation.length !== base.bip32Derivation.length ||
    input.bip32Derivation.some((d,i) => !Buffer.from(d.pubkey).equals(Buffer.from(base.bip32Derivation[i].pubkey)) ||
      d.path !== base.bip32Derivation[i].path ||
      !Buffer.from(d.masterFingerprint).equals(Buffer.from(base.bip32Derivation[i].masterFingerprint)))
  )) throw Error('Signer derivation changed');
  const sigs = input.partialSig || [];
  if (sigs.length !== 1 || !Buffer.from(sigs[0].pubkey).equals(Buffer.from(expectedPubkeyHex, 'hex')))
    throw Error('Missing or unexpected signer signature');
  const signature = Buffer.from(sigs[0].signature);
  if (signature.length < 9 || signature.at(-1) !== bitcoin.Transaction.SIGHASH_ALL)
    throw Error('Unexpected signature hash type');
  const valid = signed.validateSignaturesOfInput(0, (pubkey, digest, compactSig) =>
    secp256k1.verify(Buffer.from(compactSig), Buffer.from(digest), Buffer.from(pubkey), { lowS: false, prehash: false }));
  if (!valid) throw Error('ECDSA signature verification failed');
  return { signed, signatureCount: sigs.length };
}
