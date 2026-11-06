
// bc1q21 Professional — disposable regtest release bridge.
// Converts the existing public-only release builder output into
// gift-specific unsigned PSBT evidence for the recipient page.
// No private keys, signing, network requests, or broadcasting.

import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import { prepareProfessionalReleaseFromPublicHandoff }
  from './public-funding-release-integration.mjs';

export function prepareRecipientReleaseEvidence({
  publicHandoff,
  funding,
  releaseNumber
}) {
  if (!Number.isSafeInteger(releaseNumber) ||
      releaseNumber < 1 ||
      releaseNumber > 24) {
    throw Error('Invalid release number');
  }

  const built = prepareProfessionalReleaseFromPublicHandoff(
    publicHandoff,
    funding
  );

  if (built.network !== 'regtest' ||
      built.signed !== false ||
      built.broadcast !== false) {
    throw Error('Unsafe release builder result');
  }

  const approvedUnsignedBase64 = built.unsignedPsbtBase64;

  if (typeof approvedUnsignedBase64 !== 'string' ||
      approvedUnsignedBase64.length === 0) {
    throw Error('Missing unsigned PSBT');
  }

  // Derive the recipient record from the actual PSBT, not caller assertions.
  const psbt = bitcoin.Psbt.fromBase64(approvedUnsignedBase64, {
    network: bitcoin.networks.regtest
  });
  if (psbt.inputCount !== 1 || psbt.txOutputs.length !== 1 ||
      psbt.data.inputs[0]?.partialSig?.length ||
      psbt.data.inputs[0]?.finalScriptSig ||
      psbt.data.inputs[0]?.finalScriptWitness) {
    throw Error('Expected a single unsigned regtest release');
  }
  const input = psbt.txInputs[0];
  const priorBytes = psbt.data.inputs[0]?.nonWitnessUtxo;
  if (!priorBytes) throw Error('Missing funding transaction evidence');
  const prior = bitcoin.Transaction.fromBuffer(priorBytes);
  const txid = Buffer.from(input.hash).reverse().toString('hex');
  const previous = prior.outs[input.index];
  if (prior.getId() !== txid || !previous) {
    throw Error('Funding transaction mismatch');
  }
  const output = psbt.txOutputs[0];
  const publicRelease = Object.freeze({
    releaseNumber,
    fundingTxid: txid,
    fundingVout: input.index,
    lockHeight: psbt.locktime,
    amountSats: output.value,
    destinationScriptHex: output.script.toString('hex'),
    fundingScriptHex: previous.script.toString('hex'),
    inputSats: previous.value,
    signingAuthorized: false
  });
  const publicGift = Object.freeze({
    fundingAddress: built.fundingAddress,
    releases: Object.freeze([publicRelease])
  });

  const expectedApprovedSha256 = createHash('sha256')
    .update(Buffer.from(approvedUnsignedBase64, 'base64'))
    .digest('hex');

  return Object.freeze({
    releaseNumber,
    approvedUnsignedBase64,
    expectedApprovedSha256,
    publicGift,
    publicRelease
  });
}
