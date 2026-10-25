// Browser-only, synthetic regtest QR animation regression. No wallet or network.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {renderProfessionalOfflineSigningStep} from './recipient-offline-signing-step.mjs';

const integration={format:'bc1q21-professional-recipient-integration-v1',network:'regtest',canSign:false,canBroadcast:false,blockers:['Recipient authorization not established']};
const session={network:'regtest',verifiedRoundTrip:true,format:'ur:crypto-psbt',signed:false,broadcast:false,
 frames:['ur:crypto-psbt/1-2/abcd','ur:crypto-psbt/2-2/efgh'],
 qrImages:['data:image/png;base64,AAAA','data:image/png;base64,BBBB']};
const fragment=renderProfessionalOfflineSigningStep(integration,session);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>requests.push(r.url()));
 await page.setContent('<!doctype html><html><body>'+fragment+'</body></html>');
 assert.equal(await page.locator('#sign').isDisabled(),true);
 assert.equal(await page.locator('#jade-signed-start').count(),1);
 assert.equal(await page.locator('#jade-qr-progress').textContent(),'QR frame 1 of 2');
 await page.waitForFunction(()=>document.querySelector('#jade-qr-progress')?.textContent==='QR frame 2 of 2',null,{timeout:5000});
 await page.locator('#jade-qr-toggle').click();
 assert.equal(await page.locator('#jade-qr-toggle').textContent(),'Resume QR animation');
 const paused=await page.locator('#jade-qr-progress').textContent();
 await page.waitForTimeout(1700);
 assert.equal(await page.locator('#jade-qr-progress').textContent(),paused);
 await page.locator('#jade-qr-toggle').click();
 assert.equal(await page.locator('#jade-qr-toggle').textContent(),'Pause QR animation');
 await page.waitForFunction(previous=>document.querySelector('#jade-qr-progress')?.textContent!==previous,paused,{timeout:5000});
 // A gift link without independently reviewed release evidence must not expose QR or camera.
 const denied=renderProfessionalOfflineSigningStep(integration);
 const deniedPage=await browser.newPage();
 await deniedPage.setContent('<!doctype html><html><body>'+denied+'</body></html>');
 assert.equal(await deniedPage.locator('#sign').isDisabled(),true);
 assert.equal(await deniedPage.locator('#jade-unsigned-qr').count(),0);
 assert.equal(await deniedPage.locator('#jade-signed-start').count(),0);
 assert.match(await deniedPage.locator('body').textContent(),/Offline QR signing is not available/);
 assert.match(await deniedPage.locator('body').textContent(),/Recipient authorization not established/);
 await deniedPage.close();
 assert.deepEqual(errors,[],'No JavaScript errors');
 assert.deepEqual(requests,[],'No network requests');
 console.log('PASS: Chromium QR animation, pause/resume, fail-closed signing and no network');
}finally{await browser.close();}
