import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {mapProfessionalGiftLocatorToSchedule} from './option-b-explicit-link-map.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const firstDate='2031-01-15';
const h=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex:0,locktime:retailDateToCltvTimestamp(firstDate)});
const published={accountXpub,masterFingerprintHex,firstDate,interval:'month',outputScriptsHex:[h.fundingScriptPubKeyHex]};
const fundingAddress='bcrt1q'+'q'.repeat(38);
const giftUrl='https://example.invalid/gift/'+fundingAddress+'?interval=month';
const commitment={fundingAddress,releaseScriptsHex:[h.fundingScriptPubKeyHex]};
test('explicit mapping preserves distinct creator locator and first release address',()=>{
 const mapped=mapProfessionalGiftLocatorToSchedule(giftUrl,published,commitment);
 assert.equal(mapped.giftLocatorAddress,fundingAddress);
 assert.equal(mapped.firstReleaseAddress,h.fundingAddress);
 assert.equal(mapped.addressesDistinct,true);
 assert.equal(mapped.releases[0].date,firstDate);
 for(const key of ['mappingAuthenticated','chainVerified','recipientAuthenticated','readyForLiveRouting','canSign','canBroadcast'])
  assert.equal(mapped[key],false);
});
test('reject mismatched gift-card locator and altered public script mapping',()=>{
 assert.throws(()=>mapProfessionalGiftLocatorToSchedule(giftUrl,published,{...commitment,fundingAddress:h.fundingAddress}),/disagree/);
 assert.throws(()=>mapProfessionalGiftLocatorToSchedule(giftUrl,published,{...commitment,releaseScriptsHex:['a914'+'00'.repeat(20)+'87']}),/do not match/);
 assert.throws(()=>mapProfessionalGiftLocatorToSchedule(giftUrl,published,{...commitment,secret:'no'}),/Unexpected mapping fields/);
});
test('reject shifted release dates rather than accepting a forged schedule',()=>{
 assert.throws(()=>mapProfessionalGiftLocatorToSchedule(giftUrl,{...published,firstDate:'2031-01-16'},commitment),/does not match/);
});
