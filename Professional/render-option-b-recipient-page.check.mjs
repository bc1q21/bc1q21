import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {renderOptionBRecipientPage} from './render-option-b-recipient-page.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const dates=['2031-01-15','2031-02-15'];
const handoffs=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)}));
const published={accountXpub,masterFingerprintHex,firstDate:dates[0],interval:'month',outputScriptsHex:handoffs.map(h=>h.fundingScriptPubKeyHex)};
const url='https://example.invalid/gift/'+handoffs[0].fundingAddress+'?interval=month';
test('renders Option B dates from verified scripts, never signing or networking',()=>{
 const html=renderOptionBRecipientPage(url,published);
 for(const date of dates)assert.ok(html.includes('<td>'+date+'</td>'));
 assert.match(html,/2 scheduled releases/);
 assert.match(html,/id="sign" disabled/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/<td>130<\/td>/);
 assert.doesNotMatch(html,/66,000 disposable/);
 assert.doesNotMatch(html,/<textarea\b|<input\b[^>]*type=["']password/i);
 assert.doesNotMatch(html,/broadcastTransaction\s*\(/);
});
test('does not render an altered schedule',()=>{
 assert.throws(()=>renderOptionBRecipientPage(url,{...published,firstDate:'2031-01-16'}));
});
