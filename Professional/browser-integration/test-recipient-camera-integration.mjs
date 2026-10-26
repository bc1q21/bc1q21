// Recipient page regression: Jade camera transport must be wired, and gift release stays locked.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const external=[];
 await page.route('**/*',route=>{
  if(route.request().url().startsWith('file:'))return route.continue();
  external.push(route.request().url());return route.abort();
 });
 await page.goto(pathToFileURL(resolve('../recipient-gift-specific-prototype.html')).href);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 await page.locator('#selectedRelease').selectOption('2');
 assert.match(await page.locator('#selectedReleaseStatus').innerText(),/Release 2 selected/);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/No gift-specific transaction evidence loaded/);
 const giftFixture={fundingAddress:'bc1q21publicgiftlocator12345678901234567890',releases:[{releaseNumber:2,fundingTxid:'ab'.repeat(32),fundingVout:1,lockHeight:500,inputSats:15000,fundingScriptHex:'a914'+'11'.repeat(20)+'87'}]};
 await page.evaluate(record=>{globalThis.bc1q21ProfessionalPublicGiftRecord=record;history.replaceState(null,'','?a='+record.fundingAddress);},giftFixture);
 await page.locator('#selectedRelease').selectOption('');
 await page.locator('#selectedRelease').selectOption('2');
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/abababab/);
 await page.locator('#selectedRelease').selectOption('2');
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/not chain verified/);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 await page.locator('#publicGiftFile').setInputFiles({name:'gift.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(giftFixture))});
 assert.match(await page.locator('#giftRecordStatus').innerText(),/public gift record loaded/i);
 assert.equal(await page.locator('#giftRecordSource').innerText(),'Local JSON file (untrusted)');
 assert.equal(await page.locator('#selectedRelease option').count(),2);
 await page.locator('#selectedRelease').selectOption('2');
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/abababab/);
 const invalid={...giftFixture,fundingAddress:'bc1q21wronggiftlocator12345678901234567890'};
 await page.locator('#publicGiftFile').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
 assert.match(await page.locator('#giftRecordStatus').innerText(),/Rejected public gift record/);
 assert.equal(await page.locator('#giftRecordSource').innerText(),'No record loaded');
 assert.equal(await page.locator('#selectedRelease option').count(),5);
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/No gift-specific transaction evidence loaded/);
 assert.equal(await page.evaluate(()=>globalThis.bc1q21ProfessionalPublicGiftRecord),null);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 await page.locator('#publicGiftFile').setInputFiles({name:'gift.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(giftFixture))});
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/not chain verified/);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 assert.equal(await page.locator('#stopCamera').isDisabled(),true);
 assert.equal(await page.locator('#startCamera').isEnabled(),true);
 assert.equal(await page.evaluate(()=>typeof globalThis.bc1q21ProfessionalAttachCamera),'function','Recipient requires built Jade browser verifier');
 assert.equal(await page.evaluate(()=>typeof globalThis.bc1q21ProfessionalCheckUtxoSnapshot),'function','Recipient bundle requires read-only UTXO consistency gate');
 const gateResult=await page.evaluate(()=>{
  const release={fundingTxid:'ab'.repeat(32),fundingVout:1,inputSats:15000,fundingScriptHex:'a914'+'11'.repeat(20)+'87'};
  const snapshot={txid:release.fundingTxid,vout:release.fundingVout,valueSats:15000,scriptPubKeyHex:release.fundingScriptHex,confirmed:true,spent:false};
  const binding={transactionMatchesSuppliedRelease:true};
  const matched=globalThis.bc1q21ProfessionalCheckUtxoSnapshot({binding,release,snapshot});
  let rejected=false;
  try{globalThis.bc1q21ProfessionalCheckUtxoSnapshot({binding,release,snapshot:{...snapshot,spent:true}})}catch{rejected=true}
  return {matched:matched.utxoSnapshotMatchesSelectedRelease,authorized:matched.signingAuthorized,chainVerified:matched.chainVerified,rejected};
 });
 assert.deepEqual(gateResult,{matched:true,authorized:false,chainVerified:false,rejected:true});
 await page.locator('#startCamera').click();
 await page.waitForFunction(()=>document.querySelector('#cameraStatus').textContent!=='Camera stopped.');
 assert.equal(await page.locator('#sign').isDisabled(),true,'Camera must never unlock gift release');
 assert.equal(await page.locator('#giftRecordSource').innerText(),'Local JSON file (untrusted)');
 if(await page.locator('#stopCamera').isEnabled())await page.locator('#stopCamera').click();
 else assert.match(await page.locator('#cameraStatus').innerText(),/Camera error|Camera unavailable|secure browser context/i,'Unavailable camera must fail closed');
 assert.equal(await page.locator('#startCamera').isEnabled(),true);
 assert.equal(await page.locator('#stopCamera').isDisabled(),true);
 assert.deepEqual(external,[],'Recipient diagnostic must remain offline');
 console.log('PASS: recipient Jade camera wired, release locked, no network');
}finally{await browser.close();}
