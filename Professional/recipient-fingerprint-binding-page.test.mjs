import test from 'node:test';
import vm from 'node:vm';
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
const locatorMapping={fundingAddress:h.fundingAddress,releaseScriptsHex:[h.fundingScriptPubKeyHex]};
const binding={network:'regtest',fundingTxid:'ab'.repeat(32),releaseOutputs:[{index:0,vout:0,sats:12345,scriptPubKeyHex:h.fundingScriptPubKeyHex}]};

test('comparison embeds canonical public binding digest without enabling signing',()=>{
 const digest=digestProfessionalGiftBinding(binding);
 const html=renderOptionBRecipientPage(url,published,locatorMapping,binding);
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
 assert.throws(()=>renderOptionBRecipientPage(url,published,locatorMapping,{...binding,network:'mainnet'}),/Regtest binding required/);
 assert.throws(()=>renderOptionBRecipientPage(url,published,locatorMapping,{...binding,releaseOutputs:[{...binding.releaseOutputs[0],sats:0}]}),/Valid satoshi amount required/);
});

test('comparison rejects a binding with changed script or release count',()=>{
 assert.throws(()=>renderOptionBRecipientPage(url,published,locatorMapping,
  {...binding,releaseOutputs:[{...binding.releaseOutputs[0],scriptPubKeyHex:'0014'+'00'.repeat(20)}]}),/Binding script differs/);
 assert.throws(()=>renderOptionBRecipientPage(url,published,locatorMapping,
  {...binding,releaseOutputs:[]}),/Binding release count differs/);
});

function simulateFingerprintClick(html,value) {
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const inline=scripts.find(s=>s.includes('recipientFingerprint')&&s.includes('checkFingerprint'));
 assert.ok(inline,'Fingerprint interaction script must be present');
 const status={textContent:''};
 const input={value};
 let onClick;
 const button={addEventListener:(name,handler)=>{
  assert.equal(name,'click');onClick=handler;
 }};
 const document={getElementById:(id)=>({
  recipientFingerprint:input,checkFingerprint:button,fingerprintResult:status
 })[id]};
 vm.runInNewContext(inline,{document},{timeout:1000});
 assert.equal(typeof onClick,'function');
 onClick();
 return status.textContent;
}

test('actual browser click compares matching and mismatched recipient entry',()=>{
 const digest=digestProfessionalGiftBinding(binding);
 const html=renderOptionBRecipientPage(url,published,locatorMapping,binding);
 assert.match(simulateFingerprintClick(html,digest),/matches supplied binding bytes only/);
 assert.match(simulateFingerprintClick(html,'00'.repeat(32)),/MISMATCH/);
 assert.match(simulateFingerprintClick(html,'invalid'),/Invalid fingerprint format/);
 assert.match(simulateFingerprintClick(html,digest.match(/.{8}/g).join(' ')),/matches supplied binding bytes only/);
});
test('actual browser click without binding cannot claim a match',()=>{
 const html=renderOptionBRecipientPage(url,published);
 assert.match(simulateFingerprintClick(html,digestProfessionalGiftBinding(binding)),/Format valid only/);
 assert.doesNotMatch(simulateFingerprintClick(html,digestProfessionalGiftBinding(binding)),/matches supplied binding bytes/);
});
