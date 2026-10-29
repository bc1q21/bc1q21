// bc1q21 Professional isolated lifecycle: PLAN -> FUND -> SIGN -> VERIFY -> FINISH.
// This is a local state guard, NOT proof of chain funding or broadcast authority.
// Only a trusted funding verifier may supply the evidence for confirmFunding().
export function createProfessionalGiftEditGate() {
 let state='planning',approvedPsbtSha256=null;
 const fail=m=>{throw Error('Professional gift lifecycle: '+m)};
 return Object.freeze({
  get state(){return state;},
  get canEdit(){return state==='planning';},
  get canFund(){return state==='funding';},
  get canSign(){return state==='funded';},
  get canFinish(){return state==='verified';},
  get canBroadcast(){return false;},
  startFunding(){
   if(state!=='planning')fail('Gift must be planned before funding');
   state='funding';
  },
  cancelFunding(){
   if(state!=='funding')fail('No funding attempt to cancel');
   state='planning';
  },
  confirmFunding(evidence){
   if(state!=='funding')fail('Funding is not awaiting confirmation');
   if(evidence?.network!=='regtest'||evidence.chainVerified!==true||
      evidence.fundingOutpointsVerified!==true||
      evidence.giftSpecificVerified!==true||
      evidence.broadcastAuthorized!==false)
     fail('Trusted gift-specific chain funding evidence required');
   state='funded';
  },
  startSigning(unsigned){
   if(state!=='funded')fail('Funding must be confirmed before signing');
   if(unsigned?.format!=='bc1q21-professional-funded-distribution-unsigned-psbt-v1'||
      unsigned.network!=='regtest'||unsigned.signed!==false||
      unsigned.broadcast!==false||unsigned.hardwareSignatureVerified!==false||
      typeof unsigned.psbtSha256!=='string'||!/^[0-9a-f]{64}$/i.test(unsigned.psbtSha256))
     fail('Approved unsigned funded distribution PSBT required');
   approvedPsbtSha256=unsigned.psbtSha256.toLowerCase();
   state='signing';
  },
  cancelSigning(){
   if(state!=='signing')fail('No signing attempt to cancel');
   approvedPsbtSha256=null;state='funded';
  },
  completeVerifiedSigning(verification){
   if(state!=='signing')fail('No signing attempt awaiting verification');
   if(verification?.format!=='bc1q21-professional-creator-qr-verified-v1'||
      verification.network!=='regtest'||verification.giftSpecificVerified!==true||
      verification.transactionIntentBound!==true||
      verification.signatureCryptographicallyVerified!==true||
      verification.broadcast!==false||verification.canBroadcast!==false||
      verification.approvedPsbtSha256!==approvedPsbtSha256)
     fail('Exact gift-specific cryptographic Jade verification required');
   state='verified';
  },
  abandon(){state='abandoned';approvedPsbtSha256=null;}
 });
}
