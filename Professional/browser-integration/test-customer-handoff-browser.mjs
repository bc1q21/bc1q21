import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const path=resolve('../artifacts/five-release-customer-handoff-regtest.json');
const pkg=JSON.parse(readFileSync(path,'utf8'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(resolve('../recipient-customer-handoff.html')).href);
 await page.locator('#customerPackage').setInputFiles(path);
 await page.locator('#independentDigest').fill('00'.repeat(32));
 await page.locator('#inspect').click();
 await page.waitForFunction(()=>/Rejected customer package/.test(document.getElementById('status').textContent));
 assert.match(await page.locator('#status').textContent(),/Rejected customer package/);
 assert.equal(await page.locator('#releaseDownloads').isHidden(),true);
 await page.locator('#independentDigest').fill(pkg.sha256);
 await page.locator('#inspect').click();
 await page.waitForFunction(()=>/PASS: package matches|Rejected customer package/.test(document.getElementById('status').textContent));
 assert.match(await page.locator('#status').textContent(),/PASS: package matches/);
 assert.equal(await page.locator('#releaseButtons button').count(),5);
 assert.equal(await page.locator('#releaseDownloads').isVisible(),true);
 const link=await page.locator('#recipientLink').getAttribute('href');
 assert.ok(link.includes(encodeURIComponent(pkg.gift.fundingAddress)));
 await page.locator('#customerPackage').setInputFiles({
  name:'tampered.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify({...pkg,psbts:pkg.psbts.map((p,i)=>
   i===2?{...p,expectedApprovedSha256:'00'.repeat(32)}:p)}))});
 await page.locator('#inspect').click();
 await page.waitForFunction(()=>/Rejected customer package/.test(document.getElementById('status').textContent));
 assert.match(await page.locator('#status').textContent(),/Rejected customer package/);
 assert.equal(await page.locator('#releaseDownloads').isHidden(),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: recipient handoff page requires independent digest and rejects tampered five-release PSBT.');
}finally{await browser.close()}
