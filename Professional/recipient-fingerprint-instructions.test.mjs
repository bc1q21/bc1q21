import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {renderOptionBRecipientPage} from './render-option-b-recipient-page.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const h=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex:'e29ac13c',childIndex:0,locktime:retailDateToCltvTimestamp('2031-01-15')});
const published={accountXpub,masterFingerprintHex:'e29ac13c',firstDate:'2031-01-15',interval:'month',outputScriptsHex:[h.fundingScriptPubKeyHex]};
const url='https://example.invalid/gift/'+h.fundingAddress+'?interval=month';
test('recipient page keeps script-verified dates without asking for a separate fingerprint',()=>{
 const html=renderOptionBRecipientPage(url,published);
 assert.match(html,/2031-01-15/);
 assert.match(html,/id="sign" disabled/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/recipientFingerprint|checkFingerprint|64-character gift fingerprint|independently retained fingerprint|Check your gift fingerprint/i);
 assert.doesNotMatch(html,/<textarea\\b|type="password"/i);
});
