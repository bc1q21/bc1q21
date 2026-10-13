// Isolated Professional prototype: one-time, exact-PSBT approval coordinator.
// Public-only; does not sign, broadcast, persist approval, or secure a compromised host.
import { createHash } from 'node:crypto';
import { createConfirmationSession } from './confirmation-session.mjs';
import { releaseExactlyApprovedUnsignedPsbt } from './approved-psbt-handoff.mjs';
const fail=m=>{throw Error('Professional one-time approval: '+m)};
export function createOneTimeApprovedHandoff(record,release){
 const session=createConfirmationSession(record);
 if(!release||typeof release.unsignedPsbtBase64!=='string')fail('Missing unsigned PSBT');
 const digest=createHash('sha256').update(Buffer.from(release.unsignedPsbtBase64,'base64')).digest('hex');
 if(digest!==record.psbtSha256)fail('Confirmation record does not match PSBT');
 let consumed=false;
 return Object.freeze({
  view:()=>Object.freeze({...session.view(),approvalConsumed:consumed}),
  approve:confirmation=>{
   if(consumed)fail('Approval already consumed');
   return session.approve(confirmation);
  },
  invalidate:()=>session.invalidate(),
  handoff:()=>{
   if(consumed)fail('Approval already consumed');
   if(session.view().explicitlyApproved!==true)fail('Explicit approval required');
   // Verify bytes again immediately before one-time consumption.
   const result=releaseExactlyApprovedUnsignedPsbt(release,{
    network:'regtest',psbtSha256:record.psbtSha256,explicitlyApproved:true,
    signed:false,broadcast:false
   });
   consumed=true;
   session.invalidate();
   return result;
  }
 });
}
