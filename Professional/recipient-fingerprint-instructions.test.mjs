import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {renderOptionBRecipientPage} from './render-option-b-recipient-page.mjs';

test('recipient page renders independent fingerprint guidance without authorizing signing',()=>{
 const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
 const masterFingerprintHex='e29ac13c';
 const firstDate='2031-01-15';
 const h=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,
  childIndex:0,locktime:retailDateToCltvTimestamp(firstDate)});
 const published={accountXpub,masterFingerprintHex,firstDate,interval:'month',
  outputScriptsHex:[h.fundingScriptPubKeyHex]};
 const html=renderOptionBRecipientPage(
  'https://example.invalid/gift/'+h.fundingAddress+'?interval=month',published);
 assert.match(html,/Check your gift fingerprint/);
 assert.match(html,/independently retained message/);
 assert.match(html,/does not prove who sent/);
 assert.match(html,/cannot check the fingerprint/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/<input\b|<textarea\b/i);
 assert.doesNotMatch(html,/ur:crypto-psbt\//);
});
