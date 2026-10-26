// Public-only gift release selection. No signing, secrets, RPC or broadcast.
// This module checks gift/release consistency; it does not authenticate provenance.
const fail=m=>{throw Error('Professional release selection: '+m)};
const hex64=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const script=x=>typeof x==='string'&&/^(?:[0-9a-f]{2}){1,10000}$/.test(x);
export function selectPublicGiftRelease({gift,recipientLocator,releaseNumber}){
 if(!gift||typeof recipientLocator!=='string'||gift.fundingAddress!==recipientLocator)
  fail('Recipient link does not match public gift record');
 if(!Array.isArray(gift.releases)||gift.releases.length<1||gift.releases.length>100)
  fail('Invalid public release schedule');
 if(!Number.isSafeInteger(releaseNumber)||releaseNumber<1)fail('Invalid release selection');
 const seen=new Set();
 for(const r of gift.releases){
  if(!r||!Number.isSafeInteger(r.releaseNumber)||r.releaseNumber<1||seen.has(r.releaseNumber))
   fail('Duplicate or invalid release number');
  seen.add(r.releaseNumber);
  if(!hex64(r.fundingTxid)||!Number.isSafeInteger(r.fundingVout)||r.fundingVout<0||
     !Number.isSafeInteger(r.lockHeight)||r.lockHeight<0||
     !Number.isSafeInteger(r.inputSats)||r.inputSats<1||
     !script(r.fundingScriptHex))fail('Invalid release funding evidence');
 }
 const selected=gift.releases.find(r=>r.releaseNumber===releaseNumber);
 if(!selected)fail('Selected release is absent from this gift');
 return Object.freeze({fundingAddress:recipientLocator,releaseNumber:selected.releaseNumber,
  fundingTxid:selected.fundingTxid,fundingVout:selected.fundingVout,
  lockHeight:selected.lockHeight,inputSats:selected.inputSats,
  fundingScriptHex:selected.fundingScriptHex,
  giftProvenanceVerified:false,chainVerified:false,signingAuthorized:false,broadcast:false});
}
