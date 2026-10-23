// Professional-only integration facade. A caller cannot inject a fabricated
// freshness object: it is created inside the closure after one-time approval
// and a fresh Core inspection. No QR frames, signing, or broadcast exposed.
import assert from 'node:assert/strict';
import {prepareFreshGiftApprovalSequence} from './fresh-gift-approval-sequence.mjs';
import {inspectFreshApprovalForControlledQr} from './fresh-approval-qr-boundary.mjs';

export async function prepareRestrictedBeneficiaryQrBoundary({
 rpc,giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
}) {
 const sequence=await prepareFreshGiftApprovalSequence({
  rpc,giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
 });
 let finalized=false;
 return Object.freeze({
  review:()=>sequence.review(),
  approve:confirmation=>{
   assert.equal(finalized,false,'QR boundary already finalized');
   return sequence.approve(confirmation);
  },
  revoke:()=>{
   assert.equal(finalized,false,'QR boundary already finalized');
   return sequence.revoke();
  },
  finalizeReview:async()=>{
   assert.equal(finalized,false,'QR boundary already finalized');
   finalized=true; // Consume before awaiting RPC; failure cannot be retried.
   const freshness=await sequence.finalizeApproval();
   const checked=inspectFreshApprovalForControlledQr({
    freshness,giftEvidence,releaseIndex,publicHandoff,funding,approvedIntent
   });
   return Object.freeze({
    ...checked,reviewFinalized:true,
    // Explicitly no legacy QR session or exportQrFrames() on this facade.
    beneficiaryAuthorized:false,canExportSigningQr:false,
    canSign:false,canBroadcast:false
   });
  },
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
