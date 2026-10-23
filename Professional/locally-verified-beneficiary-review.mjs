// Professional-only trusted-local composition. The Core evidence is collected
// within this function through a credentialed loopback transport; callers
// cannot substitute an arbitrary giftEvidence object. Unsigned regtest QR
// export is gated by this closure, not by the legacy standalone approval.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectFreshApprovedGiftOutpoint} from './approved-gift-freshness-preflight.mjs';
import {prepareApprovedProfessionalRelease} from './approved-release-gate.mjs';
import {makeCryptoPsbtFrames} from './crypto-psbt-frames.mjs';
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
 let finalizedDigest;
 let exportConsumed=false;
 return Object.freeze({
  review:()=>restricted.review(),
  approve:confirmation=>restricted.approve(confirmation),
  revoke:()=>restricted.revoke(),
  // The legacy standalone QR approval is not beneficiary authorization.
  // This facade exports unsigned frames only after finalized local review.
  finalizeReview:async()=>{
   assert.equal(finalizationStarted,false,'Trusted review already finalized');
   finalizationStarted=true;
   const checked=await restricted.finalizeReview();
   const integrity=inspectExactUnsignedPsbtForRestrictedQr({
    checkedReview:checked,publicHandoff,funding,approvedIntent
   });
   assert.equal(integrity.exactUnsignedBytesMatched,true,'Unsigned PSBT integrity check failed');
   finalizedDigest=integrity.psbtSha256;
   finalizationSucceeded=true;
   return checked;
  },
  // Authentication of the local RPC connection does not prove the creator
  // or beneficiary identity, nor independent chain provenance.
  // State is private: caller-supplied readiness flags cannot change it.
  reviewCompleted:()=>finalizationSucceeded,
  exportQrFrames:async(options)=>{
   assert.equal(exportConsumed,false,'QR export already consumed');
   exportConsumed=true;
   assert.equal(finalizationSucceeded,true,'Successful beneficiary review required');
   const freshness=await inspectFreshApprovedGiftOutpoint({
    rpc,giftEvidence,releaseIndex,approvalReceipt:{
     network:'regtest',approvalRecorded:true,releaseIndex,
     observedTip:giftEvidence.observedTip,psbtSha256:finalizedDigest
    }
   });
   assert.equal(freshness.psbtSha256,finalizedDigest,'Approved digest changed');
   const release=prepareApprovedProfessionalRelease(publicHandoff,funding,approvedIntent);
   const bytes=Buffer.from(release.unsignedPsbtBase64,'base64');
   assert.equal(bytes.toString('base64'),release.unsignedPsbtBase64,'Invalid PSBT encoding');
   const digest=createHash('sha256').update(bytes).digest('hex');
   assert.equal(digest,finalizedDigest,'Unsigned PSBT changed');
   const frames=makeCryptoPsbtFrames(bytes,options);
   assert.equal(await rpc('getbestblockhash',[]),freshness.observedTip,'Chain tip changed');
   return Object.freeze({network:'regtest',psbtSha256:digest,frames,
    signed:false,broadcast:false,nextEncoder:'ur:crypto-psbt'});
  },
  rpcTransportScope:'credentialed-loopback-only',
  creatorAuthenticated:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
