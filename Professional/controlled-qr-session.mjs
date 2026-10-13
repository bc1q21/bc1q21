// Controlled isolated Professional entry point. Generates crypto-psbt QR
// payloads only after an exact one-time approval has been consumed.
// Test-only regtest; never signs, broadcasts, or handles secrets.
import { createHash } from 'node:crypto';
import { createProfessionalTransactionConfirmation } from './transaction-confirmation.mjs';
import { prepareApprovedProfessionalRelease } from './approved-release-gate.mjs';
import { createOneTimeApprovedHandoff } from './one-time-approved-handoff.mjs';
import { makeCryptoPsbtFrames } from './crypto-psbt-frames.mjs';
const fail=m=>{throw Error('Professional controlled QR: '+m)};
export function prepareControlledProfessionalQrSession(publicHandoff,funding,approvedIntent){
 const record=createProfessionalTransactionConfirmation(publicHandoff,funding,approvedIntent);
 const release=prepareApprovedProfessionalRelease(publicHandoff,funding,approvedIntent);
 const coordinator=createOneTimeApprovedHandoff(record,release);
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
   return Object.freeze({network:'regtest',psbtSha256:digest,frames,
    signed:false,broadcast:false,nextEncoder:'ur:crypto-psbt'});
  }
 });
}
