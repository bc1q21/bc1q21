// Controlled isolated Professional entry point. Generates crypto-psbt QR
// payloads only after an exact one-time approval has been consumed.
// Test-only regtest; never signs, broadcasts, or handles secrets.
import { createHash } from 'node:crypto';
import { createProfessionalTransactionConfirmation } from './transaction-confirmation.mjs';
import { prepareApprovedProfessionalRelease } from './approved-release-gate.mjs';
import { createOneTimeApprovedHandoff } from './one-time-approved-handoff.mjs';
import { makeCryptoPsbtFrames } from './crypto-psbt-frames.mjs';
import { finalizeAndAuditProfessionalRelease } from './finalize-and-audit-release.mjs';
const fail=m=>{throw Error('Professional controlled QR: '+m)};
export function prepareControlledProfessionalQrSession(publicHandoff,funding,approvedIntent){
 const record=createProfessionalTransactionConfirmation(publicHandoff,funding,approvedIntent);
 const release=prepareApprovedProfessionalRelease(publicHandoff,funding,approvedIntent);
 const coordinator=createOneTimeApprovedHandoff(record,release);
 const approvedTransaction=Object.freeze({fundingTxid:approvedIntent.expectedTxid,
  fundingVout:approvedIntent.vout,inputSats:approvedIntent.expectedSats,
  destinationScriptHex:approvedIntent.destinationScriptHex,payoutSats:approvedIntent.destinationSats,
  locktime:approvedIntent.locktime,signerPubkeyHex:approvedIntent.signerPubkeyHex,
  redeemScriptHex:publicHandoff.redeemScriptHex});
 let qrExported=false;
 let returnCompleted=false;
 let returnAttempted=false;
 return Object.freeze({
  confirmation:()=>coordinator.view(),
  approve:confirmation=>coordinator.approve(confirmation),
  revoke:()=>coordinator.invalidate(),
  exportQrFrames:options=>{
   // Consumes approval before constructing QR data; failure requires reapproval.
   const handoff=coordinator.handoff();
   const bytes=Buffer.from(handoff.unsignedPsbtBase64,'base64');
   const digest=createHash('sha256').update(bytes).digest('hex');
   if(digest!==record.psbtSha256)fail('PSBT changed before QR encoding');
   const frames=makeCryptoPsbtFrames(bytes,options);
   qrExported=true;
   return Object.freeze({network:'regtest',psbtSha256:digest,frames,
    signed:false,broadcast:false,nextEncoder:'ur:crypto-psbt'});
  },
  completeSignedReturn:signedPsbtBase64=>{
   if(!qrExported)fail('Approved QR handoff required before signed return');
   if(returnCompleted)fail('Signed return already completed');
   if(returnAttempted)fail('Signed return attempt already consumed; start a new approved session');
   // Fail closed: even an invalid signed return consumes this session's return slot.
   returnAttempted=true;
   const result=finalizeAndAuditProfessionalRelease(release.unsignedPsbtBase64,
    signedPsbtBase64,record.psbtSha256,approvedTransaction);
   returnCompleted=true;
   return result;
  }
 });
}
