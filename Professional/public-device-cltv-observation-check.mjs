// Compare caller-supplied PUBLIC offline-device observations with independent
// disposable CLTV vectors. This is comparison only, NOT device authentication.
import {buildPublicDeviceComparisonVectors} from './public-device-comparison-vectors.mjs';

const exact=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).length===keys.length&&Object.keys(obj).every(k=>keys.includes(k));
const fields=['date','childIndex','locktime','derivationPath','signerPubkeyHex','redeemScriptHex','fundingAddress','fundingScriptPubKeyHex'];

export function comparePublicDeviceCltvObservations(fixture, observations) {
 const expected=buildPublicDeviceComparisonVectors(fixture);
 if(!Array.isArray(observations)||observations.length!==expected.releases.length)
  throw Error('One public device observation per release required');
 observations.forEach((actual,i)=>{
  const reference=expected.releases[i];
  if(!exact(actual,fields))throw Error('Unexpected device observation field');
  for(const key of fields){
   if(typeof actual[key]!==typeof reference[key] ||
      (typeof reference[key]==='string'
        ? actual[key].toLowerCase()!==reference[key].toLowerCase()
        : actual[key]!==reference[key]))
    throw Error('Public device CLTV observation mismatch at release '+i+' field '+key);
  }
 });
 return Object.freeze({network:'regtest',matchedReleaseCount:expected.releases.length,
  publicVectorsMatch:true,deviceIdentityVerified:false,deviceOriginVerified:false,
  aesCompatibilityVerified:false,cltvSigningVerified:false,productionApproved:false});
}
