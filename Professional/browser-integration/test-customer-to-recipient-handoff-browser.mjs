import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const giftPath=resolve('../artifacts/five-funded-recipient-gift-regtest.json');
const psbtPath=resolve('../artifacts/five-funded-recipient-psbts-regtest.json');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({acceptDownloads:true});const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(resolve('../customer-recipient-handoff.html')).href);
 await page.locator('#giftFile').setInputFiles(giftPath);
 await page.locator('#psbtFile').setInputFiles(psbtPath);
 await page.locator('#prepare').click();
 await page.waitForFunction(()=>/PASS:|Rejected:/.test(document.getElementById('status').textContent));
 assert.match(await page.locator('#status').textContent(),/PASS:/);
 assert.equal(await page.locator('#ready').isVisible(),true);
 const digest=await page.locator('#digest').textContent();
 assert.match(digest,/^[a-f0-9]{64}$/);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);
 const handoff=JSON.parse(readFileSync(await download.path(),'utf8'));
 assert.equal(handoff.sha256,digest);
 assert.equal(handoff.psbts.length,5);
 const recipient=await browser.newPage();
 recipient.on('pageerror',error=>errors.push(error.message));
 await recipient.goto(pathToFileURL(resolve('../recipient-customer-handoff.html')).href);
 await recipient.locator('#customerPackage').setInputFiles(await download.path());
 await recipient.locator('#independentDigest').fill(digest);
 await recipient.locator('#inspect').click();
 await recipient.waitForFunction(()=>/PASS: package matches|Rejected customer package/.test(
  document.getElementById('status').textContent));
 assert.match(await recipient.locator('#status').textContent(),/PASS: package matches/);
 assert.equal(await recipient.locator('#releaseButtons button').count(),5);
 // Customer identity must not be inferred from an internally valid digest.
 assert.match(await recipient.locator('#releaseSummary').textContent(),/NOT verified/);
 // A changed digest immediately invalidates the recipient's previously
 // inspected package, removes every release download and requires reinspection.
 await recipient.locator('#independentDigest').fill('0'.repeat(64));
 assert.equal(await recipient.locator('#releaseDownloads').isHidden(),true);
 assert.equal(await recipient.locator('#releaseButtons button').count(),0);
 await recipient.locator('#inspect').click();
 await recipient.waitForFunction(()=>/Rejected customer package/.test(
  document.getElementById('status').textContent));
 assert.equal(await recipient.locator('#releaseDownloads').isHidden(),true);
 await recipient.close();
 await page.locator('#psbtFile').setInputFiles({
  name:'wrong-list.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(JSON.parse(readFileSync(psbtPath,'utf8')).slice(1)))});
 await page.locator('#prepare').click();
 await page.waitForFunction(()=>/Rejected:/.test(document.getElementById('status').textContent));
 assert.equal(await page.locator('#ready').isHidden(),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: customer browser creates actual package; recipient imports verified digest; invalid PSBT list rejected.');
}finally{await browser.close()}
