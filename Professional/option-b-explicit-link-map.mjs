// Isolated Professional Option B: explicit public locator -> release schedule mapping.
// This does not prove the creator supplied authentic data or that any UTXO exists.
// Never infer a creator funding address from the first CLTV release address.
import assert from 'node:assert/strict';
import {giftLocator} from './gift-link-public-candidate.mjs';
import {buildProfessionalLinkVisibleSchedule} from './public-retail-schedule-verify.mjs';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';

export function mapProfessionalGiftLocatorToSchedule(giftUrl,published,commitment) {
 const locator=giftLocator(giftUrl);
 assert.ok(commitment&&typeof commitment==='object'&&!Array.isArray(commitment),'Explicit public mapping required');
 assert.deepEqual(Object.keys(commitment).sort(),['fundingAddress','releaseScriptsHex'].sort(),
  'Unexpected mapping fields');
 assert.equal(commitment.fundingAddress,locator.fundingAddress,'Gift card locator and mapping disagree');
 const verified=buildProfessionalLinkVisibleSchedule(published);
 assert.ok(Array.isArray(commitment.releaseScriptsHex),'Release script mapping required');
 assert.deepEqual(commitment.releaseScriptsHex,published.outputScriptsHex,
  'Gift mapping release scripts do not match schedule');
 const first=deriveJadePublicCltvHandoff({
  accountXpub:published.accountXpub,masterFingerprintHex:published.masterFingerprintHex,
  childIndex:0,locktime:retailDateToCltvTimestamp(verified.firstDate)});
 return Object.freeze({
  format:'bc1q21-professional-option-b-explicit-link-map-v1',network:'regtest',
  giftLocatorAddress:locator.fundingAddress,firstReleaseAddress:first.fundingAddress,
  addressesDistinct:locator.fundingAddress!==first.fundingAddress,
  releases:verified.releases,releaseCount:verified.releaseCount,
  scriptsMatchSuppliedMapping:true,
  mappingAuthenticated:false,chainVerified:false,recipientAuthenticated:false,
  readyForLiveRouting:false,canSign:false,canBroadcast:false
 });
}
