// Professional-only trusted-local composition. The Core evidence is collected
// within this function through a credentialed loopback transport; callers
// cannot substitute an arbitrary giftEvidence object. Still no QR export.
import assert from 'node:assert/strict';
import {inspectExactUnsignedPsbtForRestrictedQr} from './restricted-unsigned-psbt-integrity.mjs';
import {createRegtestReadOnlyRpc} from './local-regtest-readonly-transport.mjs';
import {inspectAllGiftOutputsWithLocalCore} from './local-regtest-all-gift-outputs.mjs';
import {prepareRestrictedBeneficiaryQrBoundary} from './restricted-beneficiary-qr-boundary.mjs';
import {verifyProfessionalGiftBindingCommitment} from './public-gift-binding-commitment.mjs';

export async function prepareLocallyVerifiedBeneficiaryReview({
 authorization,port,binding,expectedBindingDigest,releaseIndex,publicHandoff,funding,approvedIntent
}) {
 assert.equal(binding?.network,'regtest','Regtest gift binding required');
 assert.ok(Array.isArray(binding?.releaseOutputs),'Gift release binding required');
 verifyProfessionalGiftBindingCommitment(binding,expectedBindingDigest);
 const rpc=createRegtestReadOnlyRpc({authorization,port});
 const giftEvidence=await inspectAllGiftOutputsWithLocalCore({rpc,binding});
 assert.equal(giftEvidence.outputsConsistent,true,'All gift outputs must match Core');
 const restricted=await prepareRestrictedBeneficiaryQrBoundary({
  rpc,giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
 });
 let finalizationStarted=false;
 let finalizationSucceeded=false;
 return Object.freeze({
  review:()=>restricted.review(),
  approve:confirmation=>restricted.approve(confirmation),
  revoke:()=>restricted.revoke(),
  // No unsigned PSBT bytes or QR frames are available through this trusted-local facade.
  // Legacy standalone QR approval must not be treated as beneficiary authorization.
  finalizeReview:async()=>{
   assert.equal(finalizationStarted,false,'Trusted review already finalized');
   finalizationStarted=true;
   const checked=await restricted.finalizeReview();
   const integrity=inspectExactUnsignedPsbtForRestrictedQr({
    checkedReview:checked,publicHandoff,funding,approvedIntent
   });
   assert.equal(integrity.exactUnsignedBytesMatched,true,'Unsigned PSBT integrity check failed');
   finalizationSucceeded=true;
   return checked;
  },
  // Authentication of the local RPC connection does not prove the creator
  // or beneficiary identity, nor independent chain provenance.
  // State is private: caller-supplied readiness flags cannot change it.
  reviewCompleted:()=>finalizationSucceeded,
  rpcTransportScope:'credentialed-loopback-only',
  creatorAuthenticated:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
