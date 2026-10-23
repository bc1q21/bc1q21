// Professional-only pre-approval review. This joins verified gift output
// selection with the exact unsigned transaction confirmation record, but
// deliberately does not create a QR session or assert recipient authorization.
import assert from 'node:assert/strict';
import {inspectBeneficiaryIntentAgainstGift} from './beneficiary-gift-intent-preflight.mjs';
import {createProfessionalTransactionConfirmation} from './transaction-confirmation.mjs';
import bitcoin from 'bitcoinjs-lib';

export function prepareGiftBoundBeneficiaryReview({
 giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
}) {
 const gift=inspectBeneficiaryIntentAgainstGift({giftEvidence,releaseIndex,approvedIntent});
 assert.equal(funding?.expectedTxid,gift.txid,'Funding transaction differs from gift');
 assert.equal(funding?.vout,gift.vout,'Funding output differs from gift');
 assert.equal(funding?.expectedSats,gift.inputSats,'Funding amount differs from gift');
 assert.equal(funding?.destinationSats,gift.payoutSats,'Funding payout differs from approval');
 assert.equal(publicHandoff?.locktime,approvedIntent.locktime,'Timelock differs from approval');
 const confirmation=createProfessionalTransactionConfirmation(publicHandoff,funding,approvedIntent);
 const selected=giftEvidence.verifiedOutputs[releaseIndex];
 assert.match(selected?.scriptPubKeyHex??'',/^(?:[a-f0-9]{2})+$/,'Verified gift locking script required');
 const fundingTx=bitcoin.Transaction.fromHex(funding?.fundingTxHex??'');
 assert.equal(fundingTx.getId(),gift.txid,'Funding transaction bytes differ from gift');
 assert.equal(fundingTx.outs[gift.vout]?.script.toString('hex'),selected.scriptPubKeyHex,
  'Funding locking script differs from gift');
 assert.equal(confirmation.fundingTxid,gift.txid,'PSBT transaction differs from gift');
 assert.equal(confirmation.fundingVout,gift.vout,'PSBT output differs from gift');
 assert.equal(confirmation.inputSats,gift.inputSats,'PSBT amount differs from gift');
 assert.equal(confirmation.payoutSats,gift.payoutSats,'PSBT payout differs from gift');
 assert.equal(confirmation.feeSats,gift.feeSats,'PSBT fee differs from gift');
 assert.equal(confirmation.locktime,approvedIntent.locktime,'PSBT locktime differs from approval');
 assert.equal(confirmation.destinationScriptHex,approvedIntent.destinationScriptHex.toLowerCase(),
  'PSBT destination differs from approval');
 assert.ok(/^[a-f0-9]{64}$/.test(confirmation.psbtSha256),'Exact PSBT digest required');
 return Object.freeze({
  network:'regtest',releaseIndex,transactionConfirmation:confirmation,
  giftOutputMatched:true,exactPsbtMatched:true,
  // Separate requirements: authenticated provenance, actual maturity,
  // independent human review, and explicit one-time approval.
  recipientReviewed:false,beneficiaryAuthorized:false,cltvMaturityAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
