// Professional regtest-only controlled sequence. The approval receipt never
// crosses a public input boundary: it is created by the exact-PSBT approval
// flow and immediately checked against the same gift's live Core outpoint.
// This module does NOT enable QR export, signing or broadcasting.
import assert from 'node:assert/strict';
import {prepareBeneficiaryGiftApprovalWithCore} from './beneficiary-gift-approval-core-flow.mjs';
import {consumeInternalGiftApprovalReceipt} from './internal-gift-approval-provenance.mjs';
import {inspectFreshApprovedGiftOutpoint} from './approved-gift-freshness-preflight.mjs';

export async function prepareFreshGiftApprovalSequence({
 rpc,giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
}) {
 const flow=await prepareBeneficiaryGiftApprovalWithCore({
  rpc,giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
 });
 let finished=false;
 return Object.freeze({
  review:()=>flow.review(),
  approve:confirmation=>{
   assert.equal(finished,false,'Sequence already consumed');
   return flow.approve(confirmation);
  },
  revoke:()=>flow.revoke(),
  finalizeApproval:async()=>{
   assert.equal(finished,false,'Sequence already consumed');
   // Consume the opportunity before any asynchronous RPC to prevent retries
   // or concurrent handoffs if the chain changes while awaiting Core.
   finished=true;
   const receipt=consumeInternalGiftApprovalReceipt(flow.recordApproval());
   assert.equal(receipt.psbtSha256,flow.review().psbtSha256,'Approval fingerprint changed');
   const freshness=await inspectFreshApprovedGiftOutpoint({
    rpc,giftEvidence,approvalReceipt:receipt,releaseIndex
   });
   assert.equal(freshness.psbtSha256,receipt.psbtSha256,'Freshness fingerprint mismatch');
   return Object.freeze({
    ...freshness,approvalRecorded:true,approvalConsumed:true,
    // No caller-supplied approval flag can authorize QR.
    beneficiaryAuthorized:false,canExportSigningQr:false,
    canSign:false,canBroadcast:false
   });
  },
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
