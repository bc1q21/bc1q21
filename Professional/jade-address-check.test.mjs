// Static fail-closed regression tests for the isolated Professional Jade address-check UX.
// This check does not replace physical Jade Plus testing or browser integration testing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./funding-workspace.html',import.meta.url),'utf8');
test('device address check remains in hidden developer diagnostics',()=>{
 assert.match(html,/<details id="professional-developer-tools">/);
 const diagnostic=html.indexOf('<details id="professional-developer-tools">');
 const check=html.indexOf('id="jade-address-check"');
 assert.ok(check>diagnostic);
 assert.match(html,/id="jade-address-check" hidden/);
 assert.match(html,/id="jade-address-ack"/);
 assert.match(html,/id="jade-check-address"/);
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
