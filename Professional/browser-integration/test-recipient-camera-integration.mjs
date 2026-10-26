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
 assert.equal(await page.locator('#stopCamera').isDisabled(),true);
 assert.equal(await page.locator('#startCamera').isEnabled(),true);
 assert.equal(await page.evaluate(()=>typeof globalThis.bc1q21ProfessionalAttachCamera),'function','Recipient requires built Jade browser verifier');
 await page.locator('#startCamera').click();
 await page.waitForFunction(()=>document.querySelector('#cameraStatus').textContent!=='Camera stopped.');
 assert.equal(await page.locator('#sign').isDisabled(),true,'Camera must never unlock gift release');
 await page.locator('#stopCamera').click();
 assert.equal(await page.locator('#startCamera').isEnabled(),true);
 assert.equal(await page.locator('#stopCamera').isDisabled(),true);
 assert.deepEqual(external,[],'Recipient diagnostic must remain offline');
 console.log('PASS: recipient Jade camera wired, release locked, no network');
}finally{await browser.close();}
