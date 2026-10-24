import test from 'node:test';
import assert from 'node:assert/strict';
import {digestProfessionalGiftBinding} from './public-gift-binding-commitment.mjs';
import {renderOptionBRecipientPage} from './render-option-b-recipient-page.mjs';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const firstDate='2031-01-15';
const h=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex:0,locktime:retailDateToCltvTimestamp(firstDate)});
const published={accountXpub,masterFingerprintHex,firstDate,interval:'month',outputScriptsHex:[h.fundingScriptPubKeyHex]};
const url='https://example.invalid/gift/'+h.fundingAddress+'?interval=month';
const binding={network:'regtest',fundingTxid:'ab'.repeat(32),releaseOutputs:[{index:0,vout:0,sats:12345,scriptPubKeyHex:h.fundingScriptPubKeyHex}]};

test('comparison embeds canonical public binding digest without enabling signing',()=>{
 const digest=digestProfessionalGiftBinding(binding);
 const html=renderOptionBRecipientPage(url,published,undefined,binding);
 assert.ok(html.includes('const expected="'+digest+'";'));
 assert.match(html,/Fingerprint matches supplied binding bytes only/);
 assert.match(html,/Fingerprint MISMATCH/);
 assert.match(html,/Source and funding NOT verified/);
 assert.match(html,/id="sign" disabled/);
 assert.match(html,/connect-src 'none'/);
});
test('missing binding never embeds a comparison digest',()=>{
 const html=renderOptionBRecipientPage(url,published);
 assert.match(html,/const expected=null;/);
 assert.match(html,/Format valid only/);
});
test('invalid or non-regtest bindings fail closed before rendering',()=>{
 assert.throws(()=>renderOptionBRecipientPage(url,published,undefined,{...binding,network:'mainnet'}),/Regtest binding required/);
 assert.throws(()=>renderOptionBRecipientPage(url,published,undefined,{...binding,releaseOutputs:[{...binding.releaseOutputs[0],sats:0}]}),/Valid satoshi amount required/);
});
