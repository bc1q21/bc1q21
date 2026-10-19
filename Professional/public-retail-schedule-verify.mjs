// Public-only schedule verification. No mnemonic, wallet secret, transaction signing or broadcast.
// Offline companion may reveal an authorized schedule; online side must verify each
// date against independently supplied gift output scripts and the public account xpub.
import { deriveJadePublicCltvHandoff } from './jade-xpub-cltv-handoff.mjs';
import { retailDateToCltvTimestamp } from './retail-calendar-cltv.mjs';

export function verifyPublicRetailSchedule({accountXpub,masterFingerprintHex,firstDate,interval,outputScriptsHex}) {
 if (interval !== 'month' && interval !== 'year') throw Error('Unsupported retail schedule interval');
 if (!Array.isArray(outputScriptsHex) || outputScriptsHex.length < 1 || outputScriptsHex.length > 120)
   throw Error('Invalid release output count');
 if (typeof firstDate !== 'string') throw Error('Missing first release date');
 const dates = [], releases = [];
 let date = firstDate;
 for (let index = 0; index < outputScriptsHex.length; index++) {
   const locktime = retailDateToCltvTimestamp(date);
   const h = deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex:index,locktime});
   const expected = h.fundingScriptPubKeyHex;
   if (typeof outputScriptsHex[index] !== 'string' ||
       outputScriptsHex[index].toLowerCase() !== expected)
     throw Error('Gift output does not match independently derived schedule at index ' + index);
   dates.push(date);
   releases.push(Object.freeze({index,date,locktime,fundingAddress:h.fundingAddress,
     fundingScriptPubKeyHex:expected,redeemScriptHex:h.redeemScriptHex,
     signerPubkeyHex:h.signerPubkeyHex}));
   if (index + 1 === outputScriptsHex.length) break;
   const [year,month,day] = date.split('-').map(Number);
   const next = interval === 'year'
     ? new Date(Date.UTC(year + 1, month - 1, day))
     : new Date(Date.UTC(year, month, day));
   date = next.toISOString().slice(0,10);
 }
 return Object.freeze({network:'regtest',interval,firstDate,releaseCount:releases.length,
   releases:Object.freeze(releases),secretsReceived:false,verifiedAgainstOutputScripts:true});
}


// Option B (Professional only): publish dates from independently script-verified,
// explicitly supplied public schedule metadata. No seed or Jade unlock is needed
// for viewing; possession of this data never authorizes a Bitcoin release.
// This is NOT a way to derive dates from a gift link alone.
export function buildProfessionalLinkVisibleSchedule(evidence) {
 const verified=verifyPublicRetailSchedule(evidence);
 return Object.freeze({
  format:'bc1q21-professional-link-visible-schedule-v1',
  network:'regtest',
  visibility:'anyone-with-gift-link-and-published-schedule',
  privacyTradeoffAccepted:true,
  firstDate:verified.firstDate,
  interval:verified.interval,
  releaseCount:verified.releaseCount,
  releases:Object.freeze(verified.releases.map(item=>Object.freeze({
   index:item.index,date:item.date,locktime:item.locktime
  }))),
  verifiedAgainstOutputScripts:true,
  authenticated:false,authorized:false,
  canSign:false,canBroadcast:false
 });
}
