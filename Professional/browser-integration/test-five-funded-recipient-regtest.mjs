// Browser acceptance of one Bitcoin Core transaction funding five distinct releases.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const giftPath=resolve('../artifacts/five-funded-recipient-gift-regtest.json');
const psbtsPath=resolve('../artifacts/five-funded-recipient-psbts-regtest.json');
const gift=JSON.parse(readFileSync(giftPath,'utf8'));
const psbts=JSON.parse(readFileSync(psbtsPath,'utf8'));
assert.equal(gift.releases.length,5);
assert.equal(psbts.length,5);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(resolve('../recipient-gift-specific-prototype.html')).href+
  '?a='+encodeURIComponent(gift.fundingAddress));
 await page.locator('#publicGiftFile').setInputFiles(giftPath);
 await page.waitForFunction(()=>/loaded for 5 releases/.test(document.getElementById('giftRecordStatus').textContent));
 assert.equal(await page.locator('#selectedRelease option').count(),6);
 for(let n=1;n<=5;n++){
  await page.locator('#selectedRelease').selectOption(String(n));
  const evidence=psbts[n-1];
  await page.locator('#giftPsbtFile').setInputFiles({
   name:'release-'+n+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(evidence))});
  await page.waitForFunction(()=>/Selected gift PSBT matches supplied public gift record|Rejected gift PSBT/.test(
   document.getElementById('giftCameraStatus').textContent));
  assert.match(await page.locator('#giftCameraStatus').textContent(),/Selected gift PSBT matches supplied public gift record/);
  assert.equal(await page.locator('#showUnsignedQr').isEnabled(),true);
  assert.equal(await page.locator('#saveVerifiedJadePsbt').isDisabled(),true);
  assert.equal(await page.locator('#sign').isDisabled(),true);
 }
 await page.locator('#selectedRelease').selectOption('1');
 await page.locator('#giftPsbtFile').setInputFiles({
  name:'wrong-release.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(psbts[4]))});
 await page.waitForFunction(()=>/Rejected gift PSBT/.test(document.getElementById('giftCameraStatus').textContent));
 assert.equal(await page.locator('#showUnsignedQr').isDisabled(),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: browser independently selects five funded releases, validates each PSBT, rejects cross-release import.');
}finally{await browser.close()}
