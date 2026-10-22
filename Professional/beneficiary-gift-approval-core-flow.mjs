// Professional regtest-only orchestration. Never trusts a caller's approval
// flag as proof of authorization. A reviewed fingerprint is bound to one
// gift output and maturity snapshot; QR export remains unavailable until a
// separate trusted-provenance and authorization boundary is implemented.
import assert from 'node:assert/strict';
import {issueInternalGiftApprovalReceipt} from './internal-gift-approval-provenance.mjs';
import {prepareGiftBoundBeneficiaryReview} from './gift-bound-beneficiary-review.mjs';
import {inspectGiftBoundMaturityWithCore} from './gift-bound-core-maturity-preflight.mjs';
import {createMatureGiftApprovalReview} from './mature-gift-approval-review.mjs';

export async function prepareBeneficiaryGiftApprovalWithCore({
 rpc,giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
}) {
 const giftReview=prepareGiftBoundBeneficiaryReview({
  giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
 });
 const maturity=await inspectGiftBoundMaturityWithCore({rpc,giftEvidence,review:giftReview});
 assert.equal(maturity.readyForApprovalReview,true,'Release not mature for approval');
 const session=createMatureGiftApprovalReview({giftReview,maturity});
 const fingerprint=giftReview.transactionConfirmation.psbtSha256;
 let consumed=false;
 return Object.freeze({
  review:()=>Object.freeze({
   ...session.view(),releaseIndex,observedTip:maturity.observedTip,
   psbtSha256:fingerprint,approvalConsumed:consumed,
   canExportSigningQr:false,canSign:false,canBroadcast:false
  }),
  approve:confirmation=>{
   assert.equal(consumed,false,'Approval already consumed');
   return session.approve(confirmation);
  },
  revoke:()=>session.revoke(),
  recordApproval:()=>{
   assert.equal(consumed,false,'Approval already consumed');
   assert.equal(session.view().explicitlyApproved,true,'Explicit fingerprint approval required');
   consumed=true;
   session.revoke();
   return issueInternalGiftApprovalReceipt({
    network:'regtest',releaseIndex,observedTip:maturity.observedTip,
    psbtSha256:fingerprint,approvalRecorded:true,
    // Recording approval cannot export QR or sign.
    chainProvenanceAuthenticated:false,beneficiaryAuthorized:false,
    canExportSigningQr:false,canSign:false,canBroadcast:false
   });
  }
 });
}
