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
 // Follow the genuine customer-created file through the recipient handoff
 // downloads and into each of the five recipient release selectors.
 const [giftDownload]=await Promise.all([
  recipient.waitForEvent('download'),recipient.locator('#downloadGift').click()
 ]);
 const recipientPage=await browser.newPage();
 recipientPage.on('pageerror',error=>errors.push(error.message));
 await recipientPage.goto(pathToFileURL(resolve('../recipient-gift-specific-prototype.html')).href+
  '?a='+encodeURIComponent(handoff.gift.fundingAddress));
 await recipientPage.locator('#publicGiftFile').setInputFiles(await giftDownload.path());
 await recipientPage.waitForFunction(()=>/loaded for 5 releases/.test(
  document.getElementById('giftRecordStatus').textContent));
 for(let n=1;n<=5;n++){
  const [psbtDownload]=await Promise.all([
   recipient.waitForEvent('download'),
   recipient.locator('#releaseButtons button').nth(n-1).click()
  ]);
  await recipientPage.locator('#selectedRelease').selectOption(String(n));
  await recipientPage.locator('#giftPsbtFile').setInputFiles(await psbtDownload.path());
  await recipientPage.waitForFunction(()=>/Selected gift PSBT matches supplied public gift record|Rejected gift PSBT/.test(
   document.getElementById('giftCameraStatus').textContent));
  assert.match(await recipientPage.locator('#giftCameraStatus').textContent(),
   /Selected gift PSBT matches supplied public gift record/);
  assert.equal(await recipientPage.locator('#saveVerifiedJadePsbt').isDisabled(),true);
 }
 await recipientPage.close();
 // Direct recipient journey: one customer package + separately supplied digest,
 // no manual extraction of the public gift and five PSBT files.
 const direct=await browser.newPage();
 direct.on('pageerror',error=>errors.push(error.message));
 await direct.goto(pathToFileURL(resolve('../recipient-gift-specific-prototype.html')).href+
  '?a='+encodeURIComponent(handoff.gift.fundingAddress));
 await direct.locator('#completeHandoffFile').setInputFiles(await download.path());
 await direct.locator('#completeHandoffDigest').fill(digest);
 await direct.locator('#verifyCompleteHandoff').click();
 await direct.waitForFunction(()=>/PASS: independent fingerprint|Rejected handoff/.test(
  document.getElementById('completeHandoffStatus').textContent));
 assert.match(await direct.locator('#completeHandoffStatus').textContent(),/PASS:/);
 for(let n=1;n<=5;n++){
  await direct.locator('#selectedRelease').selectOption(String(n));
  await direct.waitForFunction(number=>/Selected gift PSBT matches supplied public gift record/.test(
   document.getElementById('giftCameraStatus').textContent)&&
   document.getElementById('selectedRelease').value===String(number),n);
  assert.equal(await direct.locator('#saveVerifiedJadePsbt').isDisabled(),true);
 }
 // Replacing a handoff-controlled PSBT manually revokes the complete
 // package context, even if the replacement is itself syntactically valid.
 await direct.locator('#giftPsbtFile').setInputFiles({
  name:'manual-psbt.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(handoff.psbts[0]))});
 assert.match(await direct.locator('#completeHandoffStatus').textContent(),/reverify independent fingerprint/);
 assert.equal(await direct.locator('#showUnsignedQr').isDisabled(),true);
 await direct.locator('#verifyCompleteHandoff').click();
 await direct.waitForFunction(()=>/PASS: independent fingerprint/.test(
  document.getElementById('completeHandoffStatus').textContent));
 await direct.locator('#selectedRelease').selectOption('1');
 await direct.waitForFunction(()=>/Selected gift PSBT matches supplied public gift record/.test(
  document.getElementById('giftCameraStatus').textContent));
 // Replacing the public gift record also revokes the verified handoff and
 // removes all PSBT QR/signature state. The caller must reverify the package.
 await direct.locator('#publicGiftFile').setInputFiles({
  name:'manual-gift.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(handoff.gift))});
 assert.match(await direct.locator('#completeHandoffStatus').textContent(),/reverify independent fingerprint/);
 assert.equal(await direct.locator('#showUnsignedQr').isDisabled(),true);
 await direct.locator('#verifyCompleteHandoff').click();
 await direct.waitForFunction(()=>/PASS: independent fingerprint/.test(
  document.getElementById('completeHandoffStatus').textContent));
 await direct.locator('#selectedRelease').selectOption('2');
 await direct.waitForFunction(()=>/Selected gift PSBT matches supplied public gift record/.test(
  document.getElementById('giftCameraStatus').textContent));
 await direct.locator('#completeHandoffDigest').fill('0'.repeat(64));
 assert.match(await direct.locator('#giftRecordStatus').textContent(),/No public gift record loaded/);
 assert.equal(await direct.locator('#showUnsignedQr').isDisabled(),true);
 await direct.locator('#verifyCompleteHandoff').click();
 await direct.waitForFunction(()=>/Rejected handoff/.test(document.getElementById('completeHandoffStatus').textContent));
 assert.equal(await direct.locator('#showUnsignedQr').isDisabled(),true);
 // Reject a perfectly digest-matching package delivered through a different
 // gift link: the independent digest does not override recipient locator.
 const wrongLink=await browser.newPage();
 wrongLink.on('pageerror',error=>errors.push(error.message));
 await wrongLink.goto(pathToFileURL(resolve('../recipient-gift-specific-prototype.html')).href+
  '?a='+encodeURIComponent('bcrt1q'+'z'.repeat(38)));
 await wrongLink.locator('#completeHandoffFile').setInputFiles(await download.path());
 await wrongLink.locator('#completeHandoffDigest').fill(digest);
 await wrongLink.locator('#verifyCompleteHandoff').click();
 await wrongLink.waitForFunction(()=>/Rejected handoff/.test(
  document.getElementById('completeHandoffStatus').textContent));
 assert.match(await wrongLink.locator('#completeHandoffStatus').textContent(),/does not match recipient gift link/);
 assert.equal(await wrongLink.locator('#showUnsignedQr').isDisabled(),true);
 await wrongLink.close();
 // A tampered package must not be accepted with the original independent digest.
 const tampered=structuredClone(handoff);
 tampered.gift.releases[0].inputSats+=1;
 await direct.locator('#completeHandoffFile').setInputFiles({
  name:'tampered-handoff.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(tampered))});
 await direct.locator('#completeHandoffDigest').fill(digest);
 await direct.locator('#verifyCompleteHandoff').click();
 await direct.waitForFunction(()=>/Rejected handoff/.test(
  document.getElementById('completeHandoffStatus').textContent));
 assert.equal(await direct.locator('#showUnsignedQr').isDisabled(),true);
 // A malformed package with the correct locator must clear any previously
 // imported public gift, even when validation fails after parsing.
 await direct.locator('#completeHandoffFile').setInputFiles({
  name:'malformed-handoff.json',mimeType:'application/json',
  buffer:Buffer.from('{"broken":')});
 await direct.locator('#verifyCompleteHandoff').click();
 await direct.waitForFunction(()=>/Rejected handoff/.test(
  document.getElementById('completeHandoffStatus').textContent));
 assert.match(await direct.locator('#giftRecordStatus').textContent(),/No public gift record loaded/);
 assert.equal(await direct.locator('#showUnsignedQr').isDisabled(),true);
 await direct.close();

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
