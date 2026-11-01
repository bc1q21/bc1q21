// Static fail-closed regression tests for the isolated Professional Jade address-check UX.
// This check does not replace physical Jade Plus testing or browser integration testing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./funding-workspace.html',import.meta.url),'utf8');
test('device address and read-only regtest funding check appear in customer section',()=>{
 assert.match(html,/<details id="professional-developer-tools">/);
 const customer=html.indexOf('id="customer-payment"');
 const diagnostic=html.indexOf('<details id="professional-developer-tools">');
 const check=html.indexOf('id="jade-address-check"');
 const scan=html.indexOf('id="scan-funding"');
 assert.ok(customer>=0&&customer<check&&check<scan&&scan<diagnostic);
 assert.match(html,/id="jade-address-check" hidden/);
 assert.match(html,/id="jade-address-ack"/);
 assert.match(html,/id="jade-check-address"/);
 assert.match(html,/id="scan-funding" disabled/);
 assert.match(html,/id="scan-status"/);
});
test('device acknowledgement cannot authorize funding, signing or broadcast',()=>{
 const start=html.indexOf("jadeAck.addEventListener('change'");
 const end=html.indexOf("document.getElementById('funding-xpub').addEventListener",start);
 assert.ok(start>0&&end>start);
 const handler=html.slice(start,end);
 assert.match(handler,/derivedXpub===document\.getElementById\('funding-xpub'\)\.value\.trim\(\)/);
 assert.match(handler,/address===publicFundingAddress/);
 assert.match(handler,/NOT authenticated/);
 assert.doesNotMatch(handler,/canRequestPayment\s*=|signingAuthorized\s*=|canBroadcast\s*=|\.disabled\s*=\s*false/);
});
test('wallet changes and re-derivation clear prior acknowledgement',()=>{
 for(const anchor of ["document.getElementById('funding-xpub').addEventListener('input'","document.getElementById('derive-funding-key').addEventListener('click'"]){
  const start=html.indexOf(anchor);assert.ok(start>0,anchor);
  const handler=html.slice(start,start+800);
  assert.match(handler,/jadeAck\.checked=false/);
  assert.match(handler,/document\.getElementById\('jade-address-check'\)\.hidden=true/);
  assert.match(handler,/document\.getElementById\('jade-check-address'\)\.textContent=''/);
 }
});
test('customer payment QR and trusted signing remain locked',()=>{
 assert.match(html,/Not available in this development preview/);
 assert.match(html,/<button disabled>Show funding QR<\/button>/);
 assert.match(html,/<button disabled>Continue to Jade Plus/);
});

test('Core scan rechecks the gift plan after asynchronous response',()=>{
 assert.match(html,/scanXpub!==derivedXpub\|\|document\.getElementById\('funding-xpub'\)\.value\.trim\(\)!==scanXpub\|\|!planStillMatches\(\)/);
 assert.match(html,/scanButton\.disabled=!publicFundingAddress\|\|!planStillMatches\(\)/);
});
test('Jade QR diagnostic rejects a changed gift plan',()=>{
 assert.match(html,/if\(!latestUnsigned\|\|!scannedUtxos\?\.length\|\|!planStillMatches\(\)\)/);
 assert.match(html,/latestUnsigned!==renderingUnsigned\|\|!scannedUtxos\?\.length\|\|!derivedXpub\|\|!planStillMatches\(\)/);
});

test('funding page reconciles constructed intent with observed inputs',()=>{
 const required=[
  'intent.inputs?.length!==scannedUtxos.length',
  'intent.gifts?.length!==plan.releases.length',
  'intent.networkFeeSats!==fee',
  'intent.inputTotalSats!==inputTotal',
  'gift.date!==plan.releases[i].date',
  'input.vout!==scannedUtxos[i].vout',
  'intent.change?.valueSats!==remaining',
  '!planStillMatches()'
 ];
 for(const snippet of required) assert.ok(html.includes(snippet),snippet);
});

test('funding reconciliation binds actual scripts and CLTV locktimes',()=>{
 for(const required of [
  'gift.locktime!==expectedGifts.outputs[i].locktime',
  'gift.scriptPubKeyHex!==expectedGifts.outputs[i].scriptPubKeyHex.toLowerCase()',
  'input.scriptPubKeyHex!==publicFundingScript',
  'expectedGifts.fundingScriptPubKeyHex?.toLowerCase()!==publicFundingScript',
  'intent.serviceFee!==null'
 ]) assert.ok(html.includes(required),required);
});
