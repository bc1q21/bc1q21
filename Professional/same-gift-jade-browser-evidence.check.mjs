// Browser verification using the EXACT saved unsigned and signed Jade same-gift
// regtest evidence. No camera hardware, recovery words, network, or broadcast.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {auditSameGiftUnsignedHandoff} from './audit-same-gift-unsigned-handoff.mjs';
import {finalizeJadeSignedQrReturn} from './jade-signed-qr-return.mjs';
import {makeApprovedCryptoPsbtQrFrames} from './approved-qr-handoff.mjs';
import {renderApprovedRecipientQrImages} from './recipient-approved-qr-images.mjs';
import {renderProfessionalOfflineSigningStep} from './recipient-offline-signing-step.mjs';

const [handoffFile,signedFramesFile]=process.argv.slice(2);
assert.ok(handoffFile&&signedFramesFile,'Exact same-gift handoff and captured Jade signed frames required');
const handoff=JSON.parse(readFileSync(handoffFile,'utf8'));
const audit=auditSameGiftUnsignedHandoff(handoff);
assert.equal(audit.exactUnsignedPsbtVerified,true);
const signedFrames=readFileSync(signedFramesFile,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(x=>/^ur:crypto-psbt\//i.test(x));
const finalized=finalizeJadeSignedQrReturn({handoff,frames:signedFrames});
assert.equal(finalized.signatureCryptographicallyVerified,true);
assert.equal(finalized.broadcast,false);
assert.equal(finalized.beneficiaryAuthorized,false);
const reviewed={network:'regtest',approvalVerified:true,signed:false,broadcast:false,
 nextEncoder:'ur:crypto-psbt',unsignedPsbtBase64:handoff.unsignedPsbtBase64,psbtSha256:handoff.psbtSha256};
const encoded=makeApprovedCryptoPsbtQrFrames(reviewed,{fragmentLength:120,frameCount:32});
const session=await renderApprovedRecipientQrImages(encoded);
const integration={format:'bc1q21-professional-recipient-integration-v1',network:'regtest',
 canSign:false,canBroadcast:false,blockers:['Beneficiary authorization not established']};
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent('<!doctype html><html><body>'+renderProfessionalOfflineSigningStep(integration,session)+'</body></html>');
 assert.equal(await page.locator('#sign').isDisabled(),true);
 assert.equal(await page.locator('#jade-signed-start').count(),1);
 assert.equal(await page.locator('#jade-unsigned-qr').getAttribute('src'),session.qrImages[0]);
 assert.equal(await page.locator('#jade-unsigned-qr').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await page.waitForFunction(()=>document.querySelector('#jade-qr-progress')?.textContent==='QR frame 2 of 32',null,{timeout:5000});
 assert.equal(await page.locator('#jade-unsigned-qr').getAttribute('src'),session.qrImages[1]);
 assert.deepEqual(errors,[]);
 console.log('PASS_SAME_GIFT_BROWSER_UNSIGNED_QR_AND_CAPTURED_JADE_SIGNATURE',JSON.stringify({
  txid:finalized.txid,frames:session.frames.length,signedFrames:signedFrames.length,
  signatureVerified:true,broadcast:false,beneficiaryAuthorized:false
 }));
}finally{await browser.close();}
