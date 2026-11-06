// Browser acceptance: funded Bitcoin Core regtest gift -> recipient import -> Jade QR.
// Uses only disposable artifacts created in the same CI job; no real Bitcoin.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
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
  assert.deepEqual(errors, []);
  console.log('PASS: real regtest funded gift and unsigned Jade QR load on recipient page; broadcast disabled');
} finally { await browser.close(); }
