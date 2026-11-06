// Customer -> recipient transfer package for isolated Professional regtest.
// The package carries no signing key and is NOT authenticated merely because
// its internally computed digest matches. Send digest through a separate,
// independently authenticated channel before trusting the package.
import {sha256} from '@noble/hashes/sha256';
import {Buffer} from 'buffer';
import {selectPublicGiftRelease} from './browser-integration/select-public-gift-release.mjs';
import {verifyGiftReleaseBinding} from './browser-integration/verify-gift-release-binding.mjs';
const fail=message=>{throw Error('Professional customer handoff: '+message)};
const digest=value=>Buffer.from(sha256(Buffer.from(JSON.stringify(value),'utf8'))).toString('hex');
function normalize(gift,psbts){
 if(!gift||typeof gift!=='object'||Array.isArray(gift)||
  !Array.isArray(gift.releases)||!Array.isArray(psbts)||
  gift.releases.length!==psbts.length||gift.releases.length<1||
  gift.releases.length>24)fail('Invalid gift release package');
 if(typeof gift.fundingAddress!=='string'||gift.fundingAddress.length>90)fail('Invalid gift locator');
 const ordered=[...gift.releases].sort((a,b)=>a.releaseNumber-b.releaseNumber);
 const evidences=[...psbts].sort((a,b)=>a.releaseNumber-b.releaseNumber);
 for(let i=0;i<ordered.length;i++){
  const release=ordered[i],evidence=evidences[i];
  if(release.releaseNumber!==i+1||evidence?.releaseNumber!==i+1)
   fail('Release numbering must be contiguous and unique');
  const selected=selectPublicGiftRelease({gift,recipientLocator:gift.fundingAddress,releaseNumber:i+1});
  if(selected.fundingTxid!==release.fundingTxid||selected.fundingVout!==release.fundingVout)
   fail('Selected release mismatch');
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence)||
   Object.keys(evidence).some(k=>!['releaseNumber','approvedUnsignedBase64','expectedApprovedSha256'].includes(k)))
   fail('Unexpected evidence fields');
  const result=verifyGiftReleaseBinding({gift,release,
   approvedUnsignedBase64:evidence.approvedUnsignedBase64,
   expectedApprovedSha256:evidence.expectedApprovedSha256});
  if(result.transactionMatchesSuppliedRelease!==true)fail('Release PSBT mismatch');
 }
 return {gift:{fundingAddress:gift.fundingAddress,releases:ordered.map(r=>({
  releaseNumber:r.releaseNumber,fundingTxid:r.fundingTxid,fundingVout:r.fundingVout,
  lockHeight:r.lockHeight,amountSats:r.amountSats,destinationScriptHex:r.destinationScriptHex,
  fundingScriptHex:r.fundingScriptHex,inputSats:r.inputSats
 }))},psbts:evidences.map(e=>({releaseNumber:e.releaseNumber,
  approvedUnsignedBase64:e.approvedUnsignedBase64,expectedApprovedSha256:e.expectedApprovedSha256}))};
}
export function prepareProfessionalCustomerHandoff({gift,psbts}){
 const body=normalize(gift,psbts);
 return Object.freeze({format:'bc1q21-professional-customer-handoff-regtest-v1',
  network:'regtest',...body,sha256:digest(body)});
}
export function verifyProfessionalCustomerHandoff(packageData,independentSha256){
 if(!packageData||typeof packageData!=='object'||Array.isArray(packageData)||
  Object.keys(packageData).some(k=>!['format','network','gift','psbts','sha256'].includes(k))||
  packageData.format!=='bc1q21-professional-customer-handoff-regtest-v1'||
  packageData.network!=='regtest')fail('Unsupported handoff');
 if(typeof independentSha256!=='string'||!/^[a-f0-9]{64}$/.test(independentSha256))
  fail('Independent authenticated digest required');
 const normalized=normalize(packageData.gift,packageData.psbts);
 // The independent digest authenticates the *entire* received body, not
 // merely a projection that silently discards unexpected or reordered fields.
 // Otherwise an attacker could attach misleading metadata while preserving
 // the authenticated digest of the normalized subset.
 if(JSON.stringify({gift:packageData.gift,psbts:packageData.psbts})!==
    JSON.stringify(normalized))fail('Noncanonical or extra handoff fields');
 const actual=digest(normalized);
 if(actual!==packageData.sha256||actual!==independentSha256)
  fail('Package differs from independently received digest');
 return Object.freeze({network:'regtest',sha256:actual,
  independentlySuppliedDigestMatches:true,
  creatorIdentityAuthenticated:false,chainVerified:false,
  signingAuthorized:false,broadcast:false,releaseCount:normalized.gift.releases.length});
}
