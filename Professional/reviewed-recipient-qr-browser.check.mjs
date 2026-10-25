// Chromium acceptance of the real reviewed recipient QR display component.
// Uses disposable regtest PSBT bytes, not a live Core session or physical Jade.
// No keys, wallet access, broadcast or network requests.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {makeCryptoPsbtFrames} from './crypto-psbt-frames.mjs';
import {renderApprovedRecipientQrImages} from './recipient-approved-qr-images.mjs';
import {renderProfessionalOfflineSigningStep} from './recipient-offline-signing-step.mjs';
const fixture=JSON.parse(readFileSync('Professional/fixtures/same-gift-unsigned-handoff.json','utf8'));
const frames=makeCryptoPsbtFrames(Buffer.from(fixture.unsignedPsbtBase64,'base64'),{fragmentLength:120,frameCount:8});
const session=await renderApprovedRecipientQrImages({network:'regtest',format:'ur:crypto-psbt',
 verifiedRoundTrip:true,frames,signed:false,broadcast:false});
const integration={format:'bc1q21-professional-recipient-integration-v1',
 network:'regtest',canSign:false,canBroadcast:false,
 blockers:['No beneficiary authorization is established by this fixture']};
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>requests.push(r.url()));
 await page.setContent('<!doctype html><html><body>'+renderProfessionalOfflineSigningStep(integration,session)+'</body></html>');
 assert.equal(await page.locator('#sign').isDisabled(),true);
 assert.equal(await page.locator('#jade-signed-start').count(),1);
 assert.equal(await page.locator('#jade-unsigned-qr').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await page.locator('#jade-qr-toggle').click();
 assert.equal(await page.locator('#jade-qr-toggle').textContent(),'Resume QR animation');
 await page.locator('#jade-qr-toggle').click();
 assert.equal(await page.locator('#jade-qr-toggle').textContent(),'Pause QR animation');
 await page.waitForFunction(()=>document.querySelector('#jade-qr-progress')?.textContent==='QR frame 2 of 8',null,{timeout:5000});
 assert.equal(await page.locator('#jade-unsigned-qr').getAttribute('src'),session.qrImages[1]);
 assert.equal(await page.locator('input[type=password]').count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 console.log('PASS_REVIEWED_RECIPIENT_QR_BROWSER_DISPLAY',JSON.stringify({frames:frames.length,
  imageLoaded:true,pauseResume:true,networkRequests:0,broadcast:false}));
} finally {await browser.close();}
