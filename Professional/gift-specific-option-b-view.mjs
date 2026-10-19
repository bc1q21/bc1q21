// Professional Option B: gift-specific, public-only release-date view model.
// Offline/regtest prototype. Public data does not establish chain provenance or spending rights.
import {giftLocator} from './gift-link-public-candidate.mjs';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {buildProfessionalLinkVisibleSchedule} from './public-retail-schedule-verify.mjs';

export function buildGiftSpecificOptionBView(url, published) {
 const locator=giftLocator(url);
 if (!published || typeof published!=='object') throw Error('Published schedule missing');
 if (published.interval!==locator.interval) throw Error('Gift link interval conflicts with schedule');
 const verified=buildProfessionalLinkVisibleSchedule(published);
 const first=deriveJadePublicCltvHandoff({
  accountXpub:published.accountXpub,
  masterFingerprintHex:published.masterFingerprintHex,
  childIndex:0,
  locktime:retailDateToCltvTimestamp(verified.firstDate)
 });
 if(first.fundingAddress!==locator.fundingAddress)throw Error('Gift link does not match first release script');
 return Object.freeze({
  format:'bc1q21-professional-option-b-gift-view-v1',
  network:'regtest',fundingAddress:locator.fundingAddress,
  privacyNotice:'Anyone holding this gift link and published schedule can see the release dates',
  releaseCount:verified.releaseCount,
  releases:verified.releases,
  scheduleVerifiedAgainstSuppliedScripts:true,
  chainVerified:false,beneficiaryAuthenticated:false,
  unsignedPsbt:null,signedPsbt:null,canSign:false,canBroadcast:false
 });
}
