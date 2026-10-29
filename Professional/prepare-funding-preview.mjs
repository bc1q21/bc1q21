// bc1q21 Professional — create a public-only funding preview from an
// approved plan and a public Jade funding address. No private keys, chain
// reads, payment request, or signing authorization.
const fail=m=>{throw Error('Professional funding preparation: '+m)};
export function prepareProfessionalFundingPreview({plan,publicFundingAddress}){
 if(plan?.format!=='bc1q21-professional-retail-plan-preview-v1'||
    plan.status!=='UNFUNDED_PREVIEW_NOT_SIGNABLE'||
    plan.signingAuthorized!==false||plan.fundingAuthorized!==false||
    plan.broadcastAuthorized!==false||
    !Array.isArray(plan.releases)||plan.releases.length<1||plan.releases.length>60)
   fail('Reviewed Professional gift plan required');
 let total=0;
 const releases=plan.releases.map((r,i)=>{
  if(typeof r?.date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(r.date)||
     !Number.isSafeInteger(r.amountSats)||r.amountSats<=0)
   fail('Invalid release at '+i);
  const timestamp=Date.parse(r.date+'T00:00:00.000Z');
  if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==r.date||
     timestamp/1000<500000000)fail('Invalid Bitcoin release date');
  total+=r.amountSats;
  return Object.freeze({index:i,date:r.date,locktime:timestamp/1000,amountSats:r.amountSats});
 });
 if(!Number.isSafeInteger(total)||total!==plan.totalSats)fail('Gift amount changed');
 // Deliberately do not accept arbitrary user-entered addresses as authenticated.
 // A genuine address must later be derived from a Jade public wallet handoff.
 if(publicFundingAddress!=null)fail('Public funding address origin is not yet authenticated');
 return Object.freeze({
  format:'bc1q21-professional-funding-preview-v1',network:'regtest',
  releases:Object.freeze(releases),giftTotalSats:total,
  serviceFeeSats:null,networkFeeSats:null,requiredDepositSats:null,
  fundingAddress:null,depositQr:null,
  fundingStatus:'AWAITING_VERIFIED_PUBLIC_WALLET_AND_FEE_QUOTE',
  canRequestPayment:false,canSign:false,canBroadcast:false
 });
}
