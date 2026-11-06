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
 assert.deepEqual(errors,[]);
 console.log('PASS: denied Jade camera permission recovers safely; changing release clears stale signing state.');
}finally{await browser.close()}
