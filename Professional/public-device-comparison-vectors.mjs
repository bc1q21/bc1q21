// Hardware-neutral, public-only comparison vectors for a disposable regtest gift.
// Never accept recovery words, private keys, or wallet-derived AES secrets here.
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';

export function buildPublicDeviceComparisonVectors({accountXpub,masterFingerprintHex,releaseDates}) {
 if(typeof accountXpub!=='string'||!accountXpub.startsWith('xpub') ||
    !Array.isArray(releaseDates)||releaseDates.length<2||releaseDates.length>24)
   throw Error('Public account xpub and 2–24 release dates required');
 const seen=new Set();
 const releases=releaseDates.map((date,childIndex)=>{
   if(typeof date!=='string'||seen.has(date))throw Error('Invalid or duplicate release date');
   seen.add(date);
   const locktime=retailDateToCltvTimestamp(date);
   const h=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex,locktime});
   return Object.freeze({date,childIndex,locktime,
     derivationPath:`m/84'/0'/0'/1/${childIndex}`,
     signerPubkeyHex:h.signerPubkeyHex,redeemScriptHex:h.redeemScriptHex,
     fundingAddress:h.fundingAddress,fundingScriptPubKeyHex:h.fundingScriptPubKeyHex});
 });
 return Object.freeze({network:'regtest',fixtureType:'public-only-device-comparison',
  walletOriginAttested:false,deviceCompatibilityVerified:false,
  releases:Object.freeze(releases)});
}
