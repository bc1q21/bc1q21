// Camera lifecycle regression: permission denial must never strand recipient
// controls, leave signing enabled, or leak a stale selected release.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const giftPath=resolve('../artifacts/five-funded-recipient-gift-regtest.json');
const evidence=JSON.parse(readFileSync(resolve('../artifacts/five-funded-recipient-psbts-regtest.json'),'utf8'))[0];
const gift=JSON.parse(readFileSync(giftPath,'utf8'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:async()=>{throw new DOMException('Camera permission denied','NotAllowedError')}
  }});
 });
 await page.goto(pathToFileURL(resolve('../recipient-gift-specific-prototype.html')).href+
  '?a='+encodeURIComponent(gift.fundingAddress));
 await page.locator('#publicGiftFile').setInputFiles(giftPath);
 await page.waitForFunction(()=>/loaded for 5 releases/.test(document.getElementById('giftRecordStatus').textContent));
 await page.locator('#selectedRelease').selectOption('1');
 await page.locator('#giftPsbtFile').setInputFiles({name:'release1.json',
  mimeType:'application/json',buffer:Buffer.from(JSON.stringify(evidence))});
 await page.waitForFunction(()=>/Selected gift PSBT matches|Rejected gift PSBT/.test(
  document.getElementById('giftCameraStatus').textContent));
 assert.match(await page.locator('#giftCameraStatus').textContent(),/Selected gift PSBT matches/);
 assert.equal(await page.locator('#giftCameraStart').isEnabled(),true);
 await page.locator('#giftCameraStart').click();
 await page.waitForFunction(()=>/Gift camera error:/.test(document.getElementById('giftCameraStatus').textContent));
 assert.match(await page.locator('#giftCameraStatus').textContent(),/Camera permission denied/);
 assert.equal(await page.locator('#giftCameraStart').isEnabled(),true);
 assert.equal(await page.locator('#giftCameraStop').isDisabled(),true);
 assert.equal(await page.locator('#saveVerifiedJadePsbt').isDisabled(),true);
 assert.equal(await page.locator('#sign').isDisabled(),true);
 await page.locator('#selectedRelease').selectOption('2');
 assert.equal(await page.locator('#giftCameraStart').isDisabled(),true);
 assert.equal(await page.locator('#showUnsignedQr').isDisabled(),true);
 assert.equal(await page.locator('#saveVerifiedJadePsbt').isDisabled(),true);
 // Simulate a desktop webcam: the first camera request reports that no
 // rear-facing device exists; the second, generic request succeeds.
 const laptop=await browser.newPage();
 laptop.on('pageerror',e=>errors.push(e.message));
 await laptop.addInitScript(()=>{
  const calls=[];
  Object.defineProperty(window,'__cameraCalls',{value:calls});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:async options=>{
    calls.push(options);
    if(calls.length===1)throw new DOMException('Rear camera unavailable','NotFoundError');
    return new MediaStream();
   }
  }});
  HTMLMediaElement.prototype.play=async function(){};
 });
 await laptop.goto(pathToFileURL(resolve('../recipient-gift-specific-prototype.html')).href+
  '?a='+encodeURIComponent(gift.fundingAddress));
 await laptop.locator('#publicGiftFile').setInputFiles(giftPath);
 await laptop.waitForFunction(()=>/loaded for 5 releases/.test(document.getElementById('giftRecordStatus').textContent));
 await laptop.locator('#selectedRelease').selectOption('1');
 await laptop.locator('#giftPsbtFile').setInputFiles({name:'release1.json',
  mimeType:'application/json',buffer:Buffer.from(JSON.stringify(evidence))});
 await laptop.waitForFunction(()=>/Selected gift PSBT matches/.test(
  document.getElementById('giftCameraStatus').textContent));
 await laptop.locator('#giftCameraStart').click();
 await laptop.waitForFunction(()=>/Point camera at Jade Plus|Gift camera error:/.test(
  document.getElementById('giftCameraStatus').textContent));
 assert.match(await laptop.locator('#giftCameraStatus').textContent(),/Point camera at Jade Plus/);
 assert.equal(await laptop.evaluate(()=>window.__cameraCalls.length),2);
 assert.equal(await laptop.evaluate(()=>window.__cameraCalls[0].audio),false);
 assert.equal(await laptop.evaluate(()=>window.__cameraCalls[1].video),true);
 await laptop.locator('#giftCameraStop').click();
 assert.equal(await laptop.locator('#giftCameraStop').isDisabled(),true);
 assert.equal(await laptop.locator('#saveVerifiedJadePsbt').isDisabled(),true);
 await laptop.close();
 // A delayed permission response must not resurrect the camera after the
 // recipient changes releases while the browser permission dialog is open.
 const delayed=await browser.newPage();
 delayed.on('pageerror',e=>errors.push(e.message));
 await delayed.addInitScript(()=>{
  let resolveCamera;
  Object.defineProperty(window,'__resolveCamera',{get:()=>resolveCamera});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:()=>new Promise(resolve=>{resolveCamera=resolve})
  }});
  HTMLMediaElement.prototype.play=async function(){};
 });
 await delayed.goto(pathToFileURL(resolve('../recipient-gift-specific-prototype.html')).href+
  '?a='+encodeURIComponent(gift.fundingAddress));
 await delayed.locator('#publicGiftFile').setInputFiles(giftPath);
 await delayed.waitForFunction(()=>/loaded for 5 releases/.test(document.getElementById('giftRecordStatus').textContent));
 await delayed.locator('#selectedRelease').selectOption('1');
 await delayed.locator('#giftPsbtFile').setInputFiles({name:'release1.json',
  mimeType:'application/json',buffer:Buffer.from(JSON.stringify(evidence))});
 await delayed.waitForFunction(()=>/Selected gift PSBT matches/.test(
  document.getElementById('giftCameraStatus').textContent));
 await delayed.locator('#giftCameraStart').click();
 await delayed.waitForFunction(()=>typeof window.__resolveCamera==='function');
 await delayed.locator('#selectedRelease').selectOption('2');
 await delayed.evaluate(()=>{
  const track={stop(){window.__cameraStopped=true}};
  window.__resolveCamera({getTracks:()=>[track]});
 });
 await delayed.waitForFunction(()=>window.__cameraStopped===true);
 assert.equal(await delayed.locator('#giftCameraStart').isDisabled(),true);
 assert.equal(await delayed.locator('#giftCameraStop').isDisabled(),true);
 assert.equal(await delayed.locator('#saveVerifiedJadePsbt').isDisabled(),true);
 await delayed.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: denied Jade camera permission recovers safely; changing release clears stale signing state.');
}finally{await browser.close()}
