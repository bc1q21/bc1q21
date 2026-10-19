import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {buildGiftSpecificOptionBView} from './gift-specific-option-b-view.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const dates=['2031-01-15','2031-02-15'];
const handoffs=dates.map((date,index)=>deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex:index,locktime:retailDateToCltvTimestamp(date)}));
const published={accountXpub,masterFingerprintHex,firstDate:dates[0],interval:'month',outputScriptsHex:handoffs.map(x=>x.fundingScriptPubKeyHex)};
const link='https://example.invalid/gift/'+handoffs[0].fundingAddress+'?interval=month';

test('Option B gift QR locator displays script-bound dates without authorizing spend',()=>{
 const view=buildGiftSpecificOptionBView(link,published);
 assert.deepEqual(view.releases.map(x=>x.date),dates);
 assert.equal(view.fundingAddress,handoffs[0].fundingAddress);
 assert.equal(view.chainVerified,false);
 assert.equal(view.beneficiaryAuthenticated,false);
 assert.equal(view.canSign,false);
 assert.equal(view.canBroadcast,false);
 assert.equal(view.unsignedPsbt,null);
 assert.equal(JSON.stringify(view).includes(accountXpub),false);
});
test('Option B rejects altered link, dates, interval and scripts',()=>{
 assert.throws(()=>buildGiftSpecificOptionBView('https://example.invalid/gift/3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',published));
 assert.throws(()=>buildGiftSpecificOptionBView(link,{...published,firstDate:'2031-01-16'}));
 assert.throws(()=>buildGiftSpecificOptionBView(link,{...published,interval:'year'}));
 assert.throws(()=>buildGiftSpecificOptionBView(link,{...published,outputScriptsHex:[published.outputScriptsHex[0],'a914'+'00'.repeat(20)+'87']}));
});
