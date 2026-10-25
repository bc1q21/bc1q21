// Read-only funded calendar gift view. Chain checks must be completed by the
// trusted Core review before this model is constructed. This module alone
// cannot authenticate creator identity, provenance, or authorize spending.
import assert from 'node:assert/strict';
import {verifyPublicRetailSchedule} from './public-retail-schedule-verify.mjs';
import {giftLocator} from './gift-link-public-candidate.mjs';
export function buildFundedCalendarGiftView({giftUrl,published,locatorMapping,binding,coreFundingVerifiedAtReviewCreation}) {
 const locator=giftLocator(giftUrl);
 assert.equal(locator.interval,published?.interval);
 assert.equal(locatorMapping?.fundingAddress,locator.fundingAddress);
 assert.equal(binding?.network,'regtest');
 assert.match(binding.fundingTxid,/^[a-f0-9]{64}$/);
 const schedule=verifyPublicRetailSchedule(published);
 assert.equal(schedule.releaseCount,binding.releaseOutputs?.length);
 assert.equal(locatorMapping.releaseScriptsHex?.length,schedule.releaseCount);
 assert.equal(coreFundingVerifiedAtReviewCreation,true,'Trusted Core verification required');
 const releases=schedule.releases.map((r,i)=>{
  const o=binding.releaseOutputs[i];
  assert.equal(o?.index,i);assert.ok(Number.isSafeInteger(o.vout)&&o.vout>=0);
  assert.ok(Number.isSafeInteger(o.sats)&&o.sats>0);
  assert.equal(o.scriptPubKeyHex,r.fundingScriptPubKeyHex,'Funded output script differs from calendar');
  assert.equal(locatorMapping.releaseScriptsHex[i],r.fundingScriptPubKeyHex);
  return Object.freeze({index:i,date:r.date,locktime:r.locktime,vout:o.vout,sats:o.sats,
   scriptPubKeyHex:o.scriptPubKeyHex,confirmedUnspentAtReview:true,
   currentlyUnspentNotGuaranteed:true});
 });
 assert.equal(new Set(releases.map(r=>r.vout)).size,releases.length,'Duplicate funded output');
 return Object.freeze({format:'bc1q21-professional-funded-calendar-recipient-view-v1',
  network:'regtest',giftAddress:locator.fundingAddress,fundingTxid:binding.fundingTxid,
  releaseCount:releases.length,totalScheduledSats:releases.reduce((sum,r)=>sum+r.sats,0),
  releases:Object.freeze(releases),scheduleVerifiedAgainstFundedScripts:true,
  coreFundingVerifiedAtReviewCreation:true,creatorAuthenticated:false,
  recipientCommitmentProvenanceVerified:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false});
}
