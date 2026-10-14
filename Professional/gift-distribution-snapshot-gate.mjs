// Public-only synthetic composition: both snapshot and signed-output checks must pass.
// No signature verification, blockchain lookup, wallet interaction or broadcasting.
import {reconcileTrustedUtxoSnapshot} from './trusted-utxo-snapshot-check.mjs';
import {checkSignedGiftDistributionOutputs} from './signed-gift-output-intent-check.mjs';

export function checkGiftDistributionAgainstSnapshot(envelope, fundingInputs, trustedSnapshot, transactionHex) {
  const snapshotResult = reconcileTrustedUtxoSnapshot(fundingInputs, trustedSnapshot);
  const transactionResult = checkSignedGiftDistributionOutputs(envelope, fundingInputs, transactionHex);
  return Object.freeze({
    giftReference:transactionResult.giftReference,
    txid:transactionResult.txid,
    giftSats:transactionResult.giftSats,
    releaseCount:transactionResult.releaseCount,
    publicInputsMatch:snapshotResult.publicInputsMatch,
    outputsMatch:transactionResult.outputsMatch,
    snapshotSourceVerified:false,
    chainVerified:false,
    signaturesVerified:false,
    broadcast:false
  });
}
