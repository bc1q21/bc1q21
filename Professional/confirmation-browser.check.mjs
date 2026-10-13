// Real Chromium interaction test of the isolated, offline regtest-only demo.
// This tests UI behavior, NOT hardware signing or a trusted approval path.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const html=readFileSync(resolve('Professional/synthetic-transaction-confirmation.html'),'utf8');
const match=html.match(/const expected="([a-f0-9]{64})"/);
assert.ok(match,'Expected exact PSBT fingerprint must be embedded');
const expected=match[1];
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const remote=[];
 page.on('request',r=>{if(!r.url().startsWith('file:'))remote.push(r.url());});
 await page.goto(pathToFileURL(resolve('Professional/synthetic-transaction-confirmation.html')).href);
 const button=page.locator('#confirm');
 const digest=page.locator('#digest');
 const ack=page.locator('#ack');
 const status=page.locator('#result');
 assert.equal(await button.isDisabled(),true,'Opening the page must not enable approval');
 assert.equal(await status.textContent(),'Not approved.');
 await ack.check();
 assert.equal(await button.isDisabled(),true,'Checkbox alone must not approve');
 await digest.fill('00'.repeat(32));
 assert.equal(await button.isDisabled(),true,'Wrong digest must not approve');
 await digest.fill(expected);
 assert.equal(await button.isEnabled(),true,'Exact digest plus acknowledgment enables button');
 assert.equal(await status.textContent(),'Not approved.','Button enabled does not equal approval');
 await button.click();
 assert.match(await status.textContent(),/REGTEST DEMO ACKNOWLEDGED/);
 await digest.fill('ab'.repeat(32));
 assert.equal(await button.isDisabled(),true,'Editing the digest revokes approval');
 assert.equal(await status.textContent(),'Not approved.');
 await digest.fill(expected);
 await button.click();
 await ack.uncheck();
 assert.equal(await button.isDisabled(),true,'Unchecking must revoke approval');
 assert.equal(await status.textContent(),'Not approved.');
 assert.deepEqual(remote,[],'Offline demonstration must not make network requests');
 console.log('PASS: real Chromium confirms default denial, wrong-digest denial, explicit acknowledgment, revocation, and zero remote requests');
}finally{await browser.close();}
