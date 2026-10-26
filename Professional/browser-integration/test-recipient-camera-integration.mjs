import {readFileSync} from 'node:fs';
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
 assert.equal(await page.locator('#giftCameraStart').isDisabled(),true);
 assert.equal(await page.evaluate(()=>typeof globalThis.bc1q21ProfessionalAttachGiftCamera),'function');
 assert.equal(await page.evaluate(()=>typeof globalThis.bc1q21ProfessionalVerifyGiftReleaseBinding),'function');
 await page.locator('#selectedRelease').selectOption('2');
 assert.match(await page.locator('#selectedReleaseStatus').innerText(),/Release 2 selected/);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/No gift-specific transaction evidence loaded/);
 const giftFixture={fundingAddress:'bc1q21publicgiftlocator12345678901234567890',releases:[{releaseNumber:2,fundingTxid:'ab'.repeat(32),fundingVout:1,lockHeight:500,inputSats:15000,fundingScriptHex:'a914'+'11'.repeat(20)+'87'}]};
 await page.evaluate(record=>{globalThis.bc1q21ProfessionalPublicGiftRecord=record;history.replaceState(null,'','?a='+record.fundingAddress);},giftFixture);
 await page.locator('#selectedRelease').selectOption('');
 await page.locator('#selectedRelease').selectOption('2');
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/abababab/);
 assert.match(await page.locator('#utxoEvidenceStatus').innerText(),/requires authenticated Bitcoin Core confirmation/);
 const goodCore={value:0.00015,confirmations:3,scriptPubKey:{hex:'a914'+'11'.repeat(20)+'87'}};
 await page.locator('#coreUtxoFile').setInputFiles({name:'core.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(goodCore))});
 await page.waitForFunction(pattern=>new RegExp(pattern).test(document.querySelector('#coreUtxoStatus').textContent),"PASS: supplied Core response matches");
 assert.equal(await page.locator('#sign').isDisabled(),true);
 await page.locator('#coreUtxoFile').setInputFiles({name:'spent.json',mimeType:'application/json',buffer:Buffer.from('null')});
 await page.waitForFunction(pattern=>new RegExp(pattern).test(document.querySelector('#coreUtxoStatus').textContent),"Rejected Core response");
 assert.equal(await page.locator('#sign').isDisabled(),true);
 await page.locator('#coreUtxoFile').setInputFiles({name:'wrong-value.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...goodCore,value:0.00016}))});
 await page.waitForFunction(pattern=>new RegExp(pattern).test(document.querySelector('#coreUtxoStatus').textContent),"amount or script does not match");
 await page.locator('#coreUtxoFile').setInputFiles({name:'wrong-script.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...goodCore,scriptPubKey:{hex:'a914'+'22'.repeat(20)+'87'}}))});
 await page.waitForFunction(pattern=>new RegExp(pattern).test(document.querySelector('#coreUtxoStatus').textContent),"amount or script does not match");
 await page.locator('#coreUtxoFile').setInputFiles({name:'bad-tip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...goodCore,bestblock:'not-a-block'}))});
 await page.waitForFunction(pattern=>new RegExp(pattern).test(document.querySelector('#coreUtxoStatus').textContent),"Invalid Core bestblock identifier");
 assert.equal(await page.locator('#sign').isDisabled(),true);
 // A delayed Core JSON read cannot leave a PASS message after the release changes.
 await page.evaluate(()=>{
  const original=File.prototype.text;
  window.__resumeOldCore=null;
  File.prototype.text=function(){
   if(this.name==='delayed-core.json')return new Promise(resolve=>{
    window.__resumeOldCore=()=>resolve(original.call(this));
   });
   return original.call(this);
  };
  window.__restoreCoreFileText=()=>{File.prototype.text=original;};
 });
 await page.locator('#coreUtxoFile').setInputFiles({name:'delayed-core.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(goodCore))});
 await page.waitForFunction(()=>typeof window.__resumeOldCore==='function');
 await page.locator('#selectedRelease').selectOption('');
 await page.evaluate(()=>{window.__resumeOldCore();window.__restoreCoreFileText();});
 await page.waitForTimeout(100);
 assert.doesNotMatch(await page.locator('#coreUtxoStatus').innerText(),/PASS: supplied Core response matches/);
 await page.locator('#selectedRelease').selectOption('2');
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/not chain verified/);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 await page.locator('#publicGiftFile').setInputFiles({name:'gift.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(giftFixture))});
 await page.waitForFunction(()=>/public gift record loaded/i.test(document.querySelector('#giftRecordStatus').textContent));
 assert.equal(await page.locator('#giftRecordSource').innerText(),'Local JSON file (untrusted)');
 assert.equal(await page.locator('#selectedRelease option').count(),2);
 assert.match(await page.locator('#scheduleProvenance').innerText(),/NOT authenticated/);
 await page.locator('#selectedRelease').selectOption('2');
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/abababab/);
 const invalid={...giftFixture,fundingAddress:'bc1q21wronggiftlocator12345678901234567890'};
 await page.locator('#publicGiftFile').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
 await page.waitForFunction(()=>document.querySelector('#giftRecordStatus').textContent.includes('Rejected public gift record'));
 assert.equal(await page.locator('#giftRecordSource').innerText(),'No record loaded');
 assert.equal(await page.locator('#selectedRelease option').count(),5);
 assert.match(await page.locator('#scheduleProvenance').innerText(),/synthetic regtest demonstration/);
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/No gift-specific transaction evidence loaded/);
 assert.match(await page.locator('#utxoEvidenceStatus').innerText(),/No trusted Bitcoin Core UTXO evidence connected/);
 assert.equal(await page.evaluate(()=>globalThis.bc1q21ProfessionalPublicGiftRecord),null);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 await page.locator('#publicGiftFile').setInputFiles({name:'gift.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(giftFixture))});
 await page.waitForFunction(()=>/public gift record loaded/i.test(document.querySelector('#giftRecordStatus').textContent));
 await page.locator('#selectedRelease').selectOption('2');
 assert.match(await page.locator('#selectedReleaseEvidence').innerText(),/not chain verified/);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 assert.equal(await page.locator('#stopCamera').isDisabled(),true);
 assert.equal(await page.locator('#startCamera').isEnabled(),true);
 assert.equal(await page.evaluate(()=>typeof globalThis.bc1q21ProfessionalAttachCamera),'function','Recipient requires built Jade browser verifier');
 assert.equal(await page.evaluate(()=>typeof globalThis.bc1q21ProfessionalCheckUtxoSnapshot),'function','Recipient bundle requires read-only UTXO consistency gate');
 const parsedCore=await page.evaluate(()=>{
  const txid='ab'.repeat(32),vout=1;
  const good={value:0.00015,confirmations:3,scriptPubKey:{hex:'a914'+'11'.repeat(20)+'87'}};
  const parsed=globalThis.bc1q21ProfessionalParseCoreGettxout(txid,vout,good);
  let spentRejected=false,unconfirmedRejected=false;
  try{globalThis.bc1q21ProfessionalParseCoreGettxout(txid,vout,null)}catch{spentRejected=true}
  try{globalThis.bc1q21ProfessionalParseCoreGettxout(txid,vout,{...good,confirmations:0})}catch{unconfirmedRejected=true}
  return {amount:parsed.valueSats,confirmed:parsed.confirmed,spentRejected,unconfirmedRejected};
 });
 assert.deepEqual(parsedCore,{amount:15000,confirmed:true,spentRejected:true,unconfirmedRejected:true});
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
 // A delayed older gift file must not overwrite a newer imported gift.
 await page.evaluate(()=>{
  const original=File.prototype.text;
  window.__releaseDelayedGift=null;
  File.prototype.text=function(){
   if(this.name==='delayed-old-gift.json')return new Promise(resolve=>{
    window.__releaseDelayedGift=()=>resolve(original.call(this));
   });
   return original.call(this);
  };
  window.__restoreGiftFileText=()=>{File.prototype.text=original;};
 });
 await page.locator('#publicGiftFile').setInputFiles({name:'delayed-old-gift.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(giftFixture))});
 await page.waitForFunction(()=>typeof window.__releaseDelayedGift==='function');
 await page.locator('#publicGiftFile').setInputFiles({name:'new-gift.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(giftFixture))});
 await page.waitForFunction(()=>document.querySelector('#giftRecordSource').textContent==='Local JSON file (untrusted)');
 await page.evaluate(()=>{window.__releaseDelayedGift();window.__restoreGiftFileText();});
 await page.waitForTimeout(100);
 assert.equal(await page.locator('#giftRecordSource').innerText(),'Local JSON file (untrusted)');
 assert.equal(await page.locator('#selectedRelease option').count(),2);
 // End-to-end recipient page integration using the actual disposable funded gift PSBT.
 const handoff=JSON.parse(readFileSync(resolve('../fixtures/same-gift-unsigned-handoff.json'),'utf8'));
 const funded=JSON.parse(readFileSync(resolve('../fixtures/original-funded-24-public-evidence.json'),'utf8'));
 const originalOutput=funded.releaseOutputs.find(x=>x.vout===handoff.vout);
 assert.ok(originalOutput,'Original funded gift release output required');
 const actualGift={fundingAddress:funded.giftLinkFundingAddress,releases:[{
  releaseNumber:1,fundingTxid:handoff.fundingTxid,fundingVout:handoff.vout,
  lockHeight:handoff.locktime,inputSats:handoff.inputSats,
  fundingScriptHex:originalOutput.scriptPubKeyHex,
  destinationScriptHex:handoff.destinationScriptHex,amountSats:handoff.payoutSats
 }]};
 await page.evaluate(locator=>history.replaceState(null,'','?a='+encodeURIComponent(locator)),actualGift.fundingAddress);
 await page.locator('#publicGiftFile').setInputFiles({name:'actual-gift.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(actualGift))});
 await page.waitForFunction(()=>/public gift record loaded/i.test(document.querySelector('#giftRecordStatus').textContent));
 await page.locator('#selectedRelease').selectOption('1');
 await page.locator('#giftPsbtFile').setInputFiles({name:'actual-psbt.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({
  releaseNumber:1,approvedUnsignedBase64:handoff.unsignedPsbtBase64,expectedApprovedSha256:handoff.psbtSha256
 }))});
 await page.waitForFunction(()=>document.querySelector('#giftCameraStatus').textContent.includes('PSBT matches supplied public gift record'));
 // A malicious JSON evidence file must not override the selected gift/release.
 await page.locator('#giftPsbtFile').setInputFiles({name:'override.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({
  releaseNumber:1,approvedUnsignedBase64:handoff.unsignedPsbtBase64,expectedApprovedSha256:handoff.psbtSha256,
  gift:{fundingAddress:'attacker'},release:{releaseNumber:999,fundingTxid:'ff'.repeat(32)}
 }))});
 await page.waitForFunction(()=>document.querySelector('#giftCameraStatus').textContent.includes('PSBT matches supplied public gift record'));
 assert.equal(await page.locator('#showUnsignedQr').isEnabled(),true);
 const selectedIdentity=await page.evaluate(()=>({
  gift:globalThis.bc1q21ProfessionalPublicGiftRecord.fundingAddress,
  // The prepared QR verifier must still reject a mismatched release supplied explicitly.
  reject:(()=>{try{globalThis.bc1q21ProfessionalVerifyGiftReleaseBinding({gift:globalThis.bc1q21ProfessionalPublicGiftRecord,
   release:{releaseNumber:999,fundingTxid:'ff'.repeat(32)},approvedUnsignedBase64:'',expectedApprovedSha256:'ff'.repeat(32)});return false}catch{return true}})()
 }));
 assert.equal(selectedIdentity.gift,actualGift.fundingAddress);
 assert.equal(selectedIdentity.reject,true);
 assert.equal(await page.locator('#showUnsignedQr').isEnabled(),true);
 assert.equal(await page.locator('#giftScheduleRows tr').count(),1);
 assert.match(await page.locator('#giftTotalContext').innerText(),/12,000 sats across 1 releases.*untrusted gift record/);
 assert.match(await page.locator('#giftScheduleRows').innerText(),/500/);
 await page.locator('#showUnsignedQr').click();
 assert.match(await page.locator('#unsignedQrStatus').innerText(),/Animating/);
 assert.equal(await page.locator('#unsignedQrImage').isVisible(),true);
 assert.ok((await page.locator('#unsignedQrImage').getAttribute('src')).startsWith('data:image/png;base64,'));
 await page.locator('#hideUnsignedQr').click();
 // A delayed signed-camera callback cannot mark a different selected release as verified.
 await page.evaluate(()=>{
  const original=globalThis.bc1q21ProfessionalAttachGiftCamera;
  window.__staleGiftCameraCallbacks=null;
  globalThis.bc1q21ProfessionalAttachGiftCamera=options=>{
   window.__staleGiftCameraCallbacks=options;
   return {start:async()=>{},stop:()=>{}};
  };
  window.__restoreGiftCamera=()=>{globalThis.bc1q21ProfessionalAttachGiftCamera=original;};
 });
 await page.locator('#giftCameraStart').click();
 await page.waitForFunction(()=>window.__staleGiftCameraCallbacks!==null);
 await page.locator('#selectedRelease').selectOption('');
 await page.evaluate(()=>{
  window.__staleGiftCameraCallbacks.onStatus('stale scanning status');
  window.__staleGiftCameraCallbacks.onVerified({selectedRelease:1});
  window.__restoreGiftCamera();
 });
 assert.doesNotMatch(await page.locator('#giftCameraStatus').innerText(),/PASS: Jade signature verified|stale scanning status/);
 assert.equal(await page.locator('#giftCameraStart').isDisabled(),true);
 // Re-select the gift and reload its evidence; changing releases intentionally clears the PSBT.
 await page.locator('#selectedRelease').selectOption('1');
 await page.locator('#giftPsbtFile').setInputFiles({name:'reselected-psbt.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({
  releaseNumber:1,approvedUnsignedBase64:handoff.unsignedPsbtBase64,expectedApprovedSha256:handoff.psbtSha256
 }))});
 await page.waitForFunction(()=>document.querySelector('#showUnsignedQr').disabled===false);
 // A camera startup that resolves after switching releases must be stopped again.
 await page.locator('#selectedRelease').selectOption('1');
 await page.locator('#giftPsbtFile').setInputFiles({name:'startup-psbt.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({
  releaseNumber:1,approvedUnsignedBase64:handoff.unsignedPsbtBase64,expectedApprovedSha256:handoff.psbtSha256
 }))});
 await page.waitForFunction(()=>document.querySelector('#giftCameraStart').disabled===false);
 await page.evaluate(()=>{
  const original=globalThis.bc1q21ProfessionalAttachGiftCamera;
  window.__resolveCameraStartup=null;
  window.__cameraStopCount=0;
  globalThis.bc1q21ProfessionalAttachGiftCamera=()=>({
   start:()=>new Promise(resolve=>{window.__resolveCameraStartup=resolve;}),
   stop:()=>{window.__cameraStopCount++;}
  });
  window.__restoreCameraStartup=()=>{globalThis.bc1q21ProfessionalAttachGiftCamera=original;};
 });
 await page.locator('#giftCameraStart').click();
 await page.waitForFunction(()=>typeof window.__resolveCameraStartup==='function');
 await page.locator('#selectedRelease').selectOption('');
 await page.evaluate(()=>{window.__resolveCameraStartup();window.__restoreCameraStartup();});
 await page.waitForFunction(()=>window.__cameraStopCount>=2);
 assert.equal(await page.locator('#giftCameraStart').isDisabled(),true);
 await page.locator('#selectedRelease').selectOption('1');
 await page.locator('#giftPsbtFile').setInputFiles({name:'qr-after-camera-startup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({
  releaseNumber:1,approvedUnsignedBase64:handoff.unsignedPsbtBase64,expectedApprovedSha256:handoff.psbtSha256
 }))});
 await page.waitForFunction(()=>document.querySelector('#showUnsignedQr').disabled===false);
 // A slow QR renderer must not display an old release after selection changes.
 await page.evaluate(()=>{
  const original=globalThis.bc1q21ProfessionalPrepareGiftUnsignedQr;
  globalThis.__resumeOldQr=null;
  globalThis.bc1q21ProfessionalPrepareGiftUnsignedQr=async args=>{
   await new Promise(resolve=>{globalThis.__resumeOldQr=resolve;});
   return original(args);
  };
  globalThis.__restoreQr=()=>{globalThis.bc1q21ProfessionalPrepareGiftUnsignedQr=original;};
 });
 await page.locator('#showUnsignedQr').click();
 await page.waitForFunction(()=>typeof globalThis.__resumeOldQr==='function');
 await page.locator('#selectedRelease').selectOption('');
 await page.evaluate(()=>{globalThis.__resumeOldQr();globalThis.__restoreQr();});
 await page.waitForTimeout(250);
 assert.equal(await page.locator('#unsignedQrImage').isVisible(),false,'Stale QR must not appear after release changes');
 assert.equal(await page.locator('#showUnsignedQr').isDisabled(),true);

 assert.equal(await page.locator('#unsignedQrImage').isVisible(),false);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 await page.locator('#startCamera').click();
 await page.waitForFunction(()=>document.querySelector('#cameraStatus').textContent!=='Camera stopped.');
 assert.equal(await page.locator('#sign').isDisabled(),true,'Camera must never unlock gift release');
 assert.equal(await page.locator('#giftRecordSource').innerText(),'Local JSON file (untrusted)');
 if(await page.locator('#stopCamera').isEnabled())await page.locator('#stopCamera').click({timeout:1500}).catch(()=>{});
 else assert.match(await page.locator('#cameraStatus').innerText(),/Camera error|Camera unavailable|secure browser context/i,'Unavailable camera must fail closed');
 assert.equal(await page.locator('#startCamera').isEnabled(),true);
 assert.equal(await page.locator('#stopCamera').isDisabled(),true);
 assert.deepEqual(external,[],'Recipient diagnostic must remain offline');
 console.log('PASS: recipient Jade camera wired, release locked, no network');
}finally{await browser.close();}
