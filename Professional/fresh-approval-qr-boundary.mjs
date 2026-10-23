// Professional-only boundary between a freshly verified gift approval and
// the legacy controlled QR prototype. This deliberately returns NO QR data.
// A standalone QR session's own approve() remains a separate path and must
// not be exposed as the integrated beneficiary flow until refactored.
import assert from 'node:assert/strict';
import {createProfessionalTransactionConfirmation} from './transaction-confirmation.mjs';

export function inspectFreshApprovalForControlledQr({
 freshness,giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
}) {
 assert.equal(freshness?.network,'regtest','Regtest freshness required');
 assert.equal(freshness?.freshOutpointMatched,true,'Fresh outpoint verification required');
 assert.equal(freshness?.approvalStillTipBound,true,'Approval tip binding required');
 assert.equal(freshness?.approvalConsumed,true,'One-time approval must be consumed');
 assert.equal(freshness?.canExportSigningQr,false,'Freshness must not grant QR permission');
 assert.equal(freshness?.observedTip,giftEvidence?.observedTip,'Gift tip changed');
 assert.equal(freshness?.releaseIndex,releaseIndex,'Wrong gift release');
 const output=giftEvidence?.verifiedOutputs?.[releaseIndex];
 assert.ok(output&&output.index===releaseIndex,'Missing verified release');
 assert.equal(output.txid,freshness.txid,'Wrong funding transaction');
 assert.equal(output.vout,freshness.vout,'Wrong funding outpoint');
 assert.equal(output.sats,funding?.expectedSats,'Wrong funding amount');
 assert.match(output.scriptPubKeyHex??'',/^(?:[a-f0-9]{2})+$/,'Verified funding script required');
 assert.equal(giftEvidence?.verifiedOutputs?.length,giftEvidence?.releaseCount,
  'Complete verified gift release set required');
 const record=createProfessionalTransactionConfirmation(publicHandoff,funding,approvedIntent);
 assert.equal(record.psbtSha256,freshness.psbtSha256,'Approved PSBT fingerprint changed');
 assert.equal(record.fundingTxid,output.txid,'PSBT funding txid changed');
 assert.equal(record.fundingVout,output.vout,'PSBT funding output changed');
 assert.equal(record.inputSats,output.sats,'PSBT funding amount changed');
 return Object.freeze({
  network:'regtest',releaseIndex,observedTip:freshness.observedTip,
  psbtSha256:record.psbtSha256,exactApprovedPsbtMatched:true,
  // Never pass this object to the legacy QR session as a caller-owned flag.
  beneficiaryAuthorized:false,canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
