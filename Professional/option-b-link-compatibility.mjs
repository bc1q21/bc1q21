// Professional-only audit of gift-card locator compatibility with Option B.
// A creator funding address is not interchangeable with a CLTV release address.
// No wallet keys, network calls, transaction construction, signing or broadcast.
import {giftLocator} from './gift-link-public-candidate.mjs';
import {buildGiftSpecificOptionBView} from './gift-specific-option-b-view.mjs';

export function auditOptionBLinkCompatibility(giftUrl,published) {
 const locator=giftLocator(giftUrl);
 try {
  const view=buildGiftSpecificOptionBView(giftUrl,published);
  return Object.freeze({status:'release-address-link-matched',
   locatorAddress:locator.fundingAddress,
   releaseCount:view.releaseCount,
   readyForLiveRouting:false,chainVerified:false,canSign:false,canBroadcast:false});
 } catch(error) {
  // Do not hide other malformed metadata errors as a benign locator mismatch.
  if(error.message!=='Gift link does not match first release script')throw error;
  return Object.freeze({status:'funding-locator-not-release-address',
   locatorAddress:locator.fundingAddress,
   reason:'Existing gift-card funding locators cannot be treated as first CLTV release addresses. Explicit trusted mapping is required.',
   readyForLiveRouting:false,chainVerified:false,canSign:false,canBroadcast:false});
 }
}
