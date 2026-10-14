// Synthetic regtest: compare a decoded signed transaction to approved public gift outputs.
// This is an output-intent check, NOT a signature or UTXO ownership verification.
import bitcoin from 'bitcoinjs-lib';
import {validatePublicExchangeEnvelope} from './public-exchange-envelope.mjs';
import {reconcilePublicGiftDistribution} from './public-gift-distribution-accounting.mjs';

export function checkSignedGiftDistributionOutputs(envelope, fundingInputs, signedTxHex) {
  const approved = validatePublicExchangeEnvelope(envelope);
  if (approved.operation !== 'gift-distribution') throw Error('Wrong operation');
  if (!Array.isArray(fundingInputs) || fundingInputs.length < 1 ||
      fundingInputs.some(i => !i || !/^[0-9a-f]{64}$/i.test(i.txid) ||
      !Number.isInteger(i.vout) || i.vout < 0 || i.vout > 0xffffffff ||
      !Number.isSafeInteger(i.valueSats) || i.valueSats <= 0))
    throw Error('Invalid public funding outpoints');
  const totals = reconcilePublicGiftDistribution(envelope, fundingInputs.map(i=>i.valueSats));
  if (typeof signedTxHex !== 'string' || !/^(?:[0-9a-f]{2})+$/i.test(signedTxHex) ||
      signedTxHex.length > 400000) throw Error('Invalid transaction hex');
  const tx = bitcoin.Transaction.fromHex(signedTxHex);
  if (tx.ins.length !== fundingInputs.length) throw Error('Funding input count changed');
  tx.ins.forEach((input, index) => {
    const expected = fundingInputs[index];
    const actualTxid = Buffer.from(input.hash).reverse().toString('hex');
    if (actualTxid !== expected.txid.toLowerCase() || input.index !== expected.vout)
      throw Error('Funding input changed');
  });
  const p = approved.publicPayload;
  const outputs = [...p.giftOutputs,p.serviceFeeOutput,
    ...(p.changeOutput === null ? [] : [p.changeOutput])];
  if (tx.outs.length !== outputs.length + 1) throw Error('Gift output count changed');
  tx.outs.forEach((output, index) => {
    const expected = outputs[index];
    if (output.value !== expected.valueSats ||
        output.script.toString('hex') !== expected.scriptPubKeyHex.toLowerCase())
      throw Error('Gift output script, amount, or order changed');
  });
  const expectedOpReturn = bitcoin.script.compile([bitcoin.opcodes.OP_RETURN,Buffer.from(p.encryptedFirstDateHex,'hex')]);
  const actualOpReturn = tx.outs[outputs.length];
  if (actualOpReturn.value !== 0 || !actualOpReturn.script.equals(expectedOpReturn))
    throw Error('Encrypted first-date OP_RETURN changed');
  return Object.freeze({txid:tx.getId(),giftReference:approved.giftReference,
    giftSats:totals.giftSats,releaseCount:totals.releaseCount,
    outputsMatch:true,signaturesVerified:false,utxosVerified:false,broadcast:false});
}
