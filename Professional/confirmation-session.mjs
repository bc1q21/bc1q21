// Isolated Professional confirmation UI state: fail closed until user explicitly
// checks the independently derived PSBT fingerprint and approves. No signing.
const fail=m=>{throw Error('Professional confirmation: '+m)};
export function createConfirmationSession(record){
 if(!record||record.network!=='regtest'||record.signed!==false||
  record.broadcast!==false||record.approvalVerified!==true||
  !/^[a-f0-9]{64}$/.test(record.psbtSha256||''))fail('Unverified regtest record');
 const digest=record.psbtSha256;
 let approved=false;
 return Object.freeze({
  view:()=>Object.freeze({...record,explicitlyApproved:approved}),
  approve:({confirmedDigest,acknowledged}={})=>{
   if(acknowledged!==true||confirmedDigest!==digest)fail('Explicit acknowledgment and exact PSBT fingerprint required');
   approved=true;
   return Object.freeze({network:'regtest',psbtSha256:digest,explicitlyApproved:true,signed:false,broadcast:false});
  },
  invalidate:()=>{approved=false;return Object.freeze({explicitlyApproved:false});}
 });
}
