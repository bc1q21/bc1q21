// Browser acceptance: funded Bitcoin Core regtest gift -> recipient import -> Jade QR.
// Uses only disposable artifacts created in the same CI job; no real Bitcoin.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import bitcoin from 'bitcoinjs-lib';
const giftPath = resolve('../artifacts/recipient-public-gift-regtest.json');
const evidencePath = resolve('../artifacts/recipient-unsigned-psbt-regtest.json');
const gift = JSON.parse(readFileSync(giftPath, 'utf8'));
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
assert.equal(gift.releases.length, 1);
assert.equal(evidence.releaseNumber, gift.releases[0].releaseNumber);
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(resolve('../recipient-gift-specific-prototype.html')).href +
    '?a=' + encodeURIComponent(gift.fundingAddress));
  assert.equal(await page.locator('#sign').isDisabled(), true);
  assert.equal(await page.locator('#saveVerifiedJadePsbt').isDisabled(), true);
  await page.locator('#publicGiftFile').setInputFiles(giftPath);
  await page.waitForFunction(() => /Public gift record loaded for 1 releases/.test(
    document.getElementById('giftRecordStatus').textContent));
  await page.locator('#selectedRelease').selectOption(String(evidence.releaseNumber));
  await page.locator('#giftPsbtFile').setInputFiles(evidencePath);
  await page.waitForFunction(() => /Selected gift PSBT matches supplied public gift record/.test(
    document.getElementById('giftCameraStatus').textContent));
  assert.equal(await page.locator('#giftCameraStart').isEnabled(), true);
  assert.equal(await page.locator('#showUnsignedQr').isEnabled(), true);
  await page.locator('#showUnsignedQr').click();
  await page.waitForFunction(() => /Animating [1-9][0-9]* unsigned QR frames/.test(
    document.getElementById('unsignedQrStatus').textContent), null, {timeout:20000});
  assert.match(await page.locator('#unsignedQrImage').getAttribute('src'), /^data:image\//);
  await page.locator('#hideUnsignedQr').click();
  assert.equal(await page.locator('#hideUnsignedQr').isDisabled(), true);
  assert.equal(await page.locator('#sign').isDisabled(), true);
  assert.equal(await page.locator('#saveVerifiedJadePsbt').isDisabled(), true);
  const unsigned=bitcoin.Psbt.fromBase64(evidence.approvedUnsignedBase64);
  const tx=bitcoin.Transaction.fromBuffer(unsigned.data.globalMap.unsignedTx.toBuffer());
  tx.ins[0].script=bitcoin.script.compile([Buffer.from('00','hex')]);
  const sampleReceipt={format:'bc1q21-professional-regtest-release-validated-v1',
   network:'regtest',releaseNumber:evidence.releaseNumber,
   signatureVerified:true,bitcoinCoreAccepted:true,
   txid:tx.getId(),rawTransactionHex:tx.toHex(),broadcast:false};
  await page.locator('#redemptionReceiptFile').setInputFiles({
   name:'receipt.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(sampleReceipt))});
  await page.waitForFunction(()=>/UNTRUSTED FILE/.test(
   document.getElementById('redemptionReceiptStatus').textContent));
  assert.equal(await page.locator('#sign').isDisabled(),true);
  await page.locator('#redemptionReceiptFile').setInputFiles({
   name:'wrong-gift-receipt.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({...sampleReceipt,rawTransactionHex:tx.toHex().slice(0,-2)+'ff'}))});
  await page.waitForFunction(()=>/Rejected redemption receipt/.test(
   document.getElementById('redemptionReceiptStatus').textContent));
  await page.locator('#redemptionReceiptFile').setInputFiles({
   name:'invalid-receipt.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({...sampleReceipt,network:'mainnet'}))});
  await page.waitForFunction(()=>/Rejected redemption receipt/.test(
   document.getElementById('redemptionReceiptStatus').textContent));
  assert.deepEqual(errors, []);
  console.log('PASS: real regtest funded gift and unsigned Jade QR load on recipient page; broadcast disabled');
} finally { await browser.close(); }
