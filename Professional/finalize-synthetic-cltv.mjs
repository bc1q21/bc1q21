// Synthetic-only offline P2SH CLTV transaction finalization.
// No private keys, no network calls, no broadcast. Not a Bitcoin script interpreter.
import bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'buffer';
import { verifySyntheticSignedPsbt } from './verify-synthetic-signed-psbt.mjs';

export function finalizeSyntheticCltvPsbt(raw, expectedBase64, expectedPubkeyHex) {
  const { signed } = verifySyntheticSignedPsbt(raw, expectedBase64, expectedPubkeyHex);
  const input = signed.data.inputs[0];
  const redeem = Buffer.from(input.redeemScript);
  const pubkey = Buffer.from(expectedPubkeyHex, 'hex');
  // Restrict to the exact single-key CLTV fixture template.
  const expectedRedeem = Buffer.concat([Buffer.from([1,110,0xb1,0x75,33]),pubkey,Buffer.from([0xac])]);
  if (!redeem.equals(expectedRedeem)) throw Error('Unsupported CLTV redeem script');
  const tx = bitcoin.Transaction.fromBuffer(Buffer.from(signed.data.globalMap.unsignedTx.toBuffer()));
  if (tx.version < 2 || tx.locktime < 110 || tx.locktime >= 500000000 || tx.ins[0].sequence === 0xffffffff)
    throw Error('CLTV consensus prerequisites not satisfied');
  const funding = bitcoin.Transaction.fromBuffer(Buffer.from(input.nonWitnessUtxo));
  if (!Buffer.from(tx.ins[0].hash).equals(Buffer.from(funding.getHash())) ||
      tx.ins[0].index >= funding.outs.length) throw Error('Funding outpoint mismatch');
  const p2sh = bitcoin.payments.p2sh({redeem:{output:redeem}});
  if (!Buffer.from(funding.outs[tx.ins[0].index].script).equals(Buffer.from(p2sh.output)))
    throw Error('Funding P2SH output mismatch');
  const sig = Buffer.from(input.partialSig[0].signature);
  const scriptSig = bitcoin.script.compile([sig,redeem]);
  // Build final scriptSig only after signature and transaction identity validation.
  signed.finalizeInput(0, () => ({ finalScriptSig: scriptSig }));
  const finalized = signed.extractTransaction(true);
  if (!Buffer.from(finalized.ins[0].script).equals(Buffer.from(scriptSig)))
    throw Error('Final scriptSig mismatch');
  if (finalized.ins[0].witness.length !== 0) throw Error('Unexpected witness');
  return Object.freeze({
    rawTransactionHex: finalized.toHex(),
    transactionId: finalized.getId(),
    inputCount: finalized.ins.length,
    outputCount: finalized.outs.length,
    locktime: finalized.locktime,
    scriptSigHex: scriptSig.toString('hex'),
    broadcast: false,
    scriptExecutionVerified: false
  });
}
