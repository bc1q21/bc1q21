import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {viewHistoricalProfessionalGift} from './historical-funded-gift-view.mjs';
import {attachVerifiedPublicCalendarToGift} from './funded-gift-calendar-attachment.mjs';
const proof=JSON.parse(readFileSync(new URL('./fixtures/original-funded-24-public-evidence.json',import.meta.url),'utf8'));
const view=viewHistoricalProfessionalGift('https://professional-regtest.invalid/gift/'+proof.giftLinkFundingAddress,proof);
const scripts=proof.releaseOutputs.map(r=>r.scriptPubKeyHex);
const published={outputScriptsHex:scripts};
const fakeCalendar={verifiedAgainstOutputScripts:true,releaseCount:24,
 releases:scripts.map((s,index)=>({index,date:'2031-01-15',locktime:1926201600,fundingScriptPubKeyHex:s}))};
// Even matching metadata must never elevate authorization or Core provenance.
const consistent=attachVerifiedPublicCalendarToGift(view,published,fakeCalendar);
assert.equal(consistent.calendarScriptsMatched,true);
assert.equal(consistent.chainProvenanceAuthenticated,false);
assert.equal(consistent.canSign,false);
assert.equal(consistent.canExportSigningQr,false);
const changed=structuredClone(fakeCalendar);
changed.releases[0].fundingScriptPubKeyHex='a914'+'00'.repeat(20)+'87';
assert.throws(()=>attachVerifiedPublicCalendarToGift(view,published,changed));
const changedPublished=structuredClone(published);
changedPublished.outputScriptsHex[1]='a914'+'00'.repeat(20)+'87';
assert.throws(()=>attachVerifiedPublicCalendarToGift(view,changedPublished,fakeCalendar));
const heightSchedule=structuredClone(fakeCalendar);
heightSchedule.releases[0].locktime=500;
assert.throws(()=>attachVerifiedPublicCalendarToGift(view,published,heightSchedule),
 'Historical height-CLTV gift must not be treated as a calendar-timestamp gift');
const noSchedule=structuredClone(fakeCalendar);noSchedule.verifiedAgainstOutputScripts=false;
assert.throws(()=>attachVerifiedPublicCalendarToGift(view,published,noSchedule));
console.log('PASS_FUNDED_GIFT_CALENDAR_ATTACHMENT_BOUNDARY',JSON.stringify({historicalGiftOutputs:24,calendarEvidence:'synthetic-untrusted',broadcast:false}));
