// Isolated real Chromium verification of the captured physical Jade QR fixture.
// file:// only. No network requests, wallet secrets, signing or broadcast.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const fixture=readFileSync('../fixtures/calendar-release1-physical-jade-signed-qr-20261025.txt','utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 const external=[];
 // Abort all non-local requests rather than merely observing them.
 await page.route('**/*',route=>{
  const url=route.request().url();
  if(url.startsWith('file:'))return route.continue();
  external.push(url);
  return route.abort();
 });
 await page.goto(pathToFileURL(resolve('professional-verification-diagnostic.html')).href);
 await page.waitForFunction(()=>typeof globalThis.bc1q21ProfessionalVerify==='function'&&typeof globalThis.bc1q21ProfessionalAttachCamera==='function');
 assert.equal(await page.locator('#status').getAttribute('data-state'),'idle');
 await page.locator('#frames').fill(fixture);
 await page.locator('#verify').click();
 await page.waitForFunction(()=>document.querySelector('#status').dataset.state==='pass',{timeout:20000});
 assert.match(await page.locator('#status').innerText(),/No transaction was broadcast/);
 await page.locator('#frames').fill('ur:crypto-psbt/1-1/invalid');
 assert.equal(await page.locator('#status').getAttribute('data-state'),'idle');
 await page.locator('#verify').click();
 await page.waitForFunction(()=>document.querySelector('#status').dataset.state==='fail');
 // A missing verifier bundle must never produce a success state.
 await page.evaluate(()=>{globalThis.bc1q21ProfessionalVerify=undefined;});
 await page.locator('#frames').fill(fixture);
 await page.locator('#verify').click();
 await page.waitForFunction(()=>document.querySelector('#status').dataset.state==='fail');
 assert.match(await page.locator('#status').innerText(),/not loaded/i);
 await page.locator('#jade-start').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Camera unavailable')||document.querySelector('#jade-stop').disabled===false);
 if(!(await page.locator('#jade-stop').isDisabled()))await page.locator('#jade-stop').click({timeout:1500}).catch(()=>{});
 assert.notEqual(await page.locator('#status').getAttribute('data-state'),'pass');
 await page.locator('#frames').fill('UR:CRYPTO-PSBT/1-1/tampered');
 assert.equal(await page.locator('#status').getAttribute('data-state'),'idle');
 assert.deepEqual(external,[],'Diagnostic must not make network requests');
 console.log('PASS: Chromium verified physical Jade fixture; invalid frames and camera state fail closed; no network/broadcast');
} finally {await browser.close();}
