// Browser camera-path regression with original Jade signed crypto-psbt QR capture.
// Synthetic camera transport only; the QR payloads and funded gift are real regtest evidence.
// No device, keys, remote requests or broadcast.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import QRCode from 'qrcode';
import {URDecoder} from '@ngraveio/bc-ur';
import cbor from 'cbor';
import {finalizeJadeSignedQrReturn} from './jade-signed-qr-return.mjs';
const [handoffPath,framesPath]=process.argv.slice(2);
assert.ok(handoffPath&&framesPath,'Original unsigned handoff and signed frames required');
const handoff=JSON.parse(readFileSync(handoffPath,'utf8'));
const frames=readFileSync(framesPath,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>/^ur:crypto-psbt\//i.test(s));
assert.equal(frames.length,19,'Original Jade capture must contain nineteen fountain frames');
const verified=finalizeJadeSignedQrReturn({handoff,frames});
const expectedDecoder=new URDecoder();
for(const frame of frames)expectedDecoder.receivePart(frame);
assert.ok(expectedDecoder.isComplete()&&expectedDecoder.isSuccess());
const expectedSigned=Buffer.from(cbor.decodeFirstSync(Buffer.from(expectedDecoder.resultUR().cbor)));
const unsignedSha=createHash('sha256').update(Buffer.from(handoff.unsignedPsbtBase64,'base64')).digest('hex');
assert.match(handoff.signerPubkeyHex,/^(02|03)[a-f0-9]{64}$/i,'Exact handoff signer key required');
assert.equal(verified.signatureCryptographicallyVerified,true);
const qrImages=await Promise.all(frames.map(s=>QRCode.toDataURL(s,{errorCorrectionLevel:'L',margin:3,width:650})));
const bundle=await build({alias:{'node:crypto':'./Professional/browser-crypto-shim.mjs','buffer':'./Professional/node_modules/buffer/index.js'},stdin:{contents:"import {createJadeSignedCameraReceiver} from './Professional/recipient-jade-signed-camera.browser.mjs'; import {attachJadeFinalizedReleaseToRecipientSection} from './Professional/recipient-jade-signed-release.browser.mjs'; window.attachRecipientRelease=attachJadeFinalizedReleaseToRecipientSection; import {verifyReturnedSignedProfessionalPsbt} from './Professional/verify-signed-psbt-return.mjs'; import {verifySyntheticSignedPsbt} from './Professional/verify-synthetic-signed-psbt.mjs'; import {finalizeVerifiedProfessionalRelease} from './Professional/finalize-verified-release.mjs'; import {Buffer} from 'buffer'; window.makeJadeReceiver=createJadeSignedCameraReceiver; window.verifyJadeReturn=(bytes,unsigned,sha,pubkey)=>{const b=Buffer.from(bytes);verifyReturnedSignedProfessionalPsbt(unsigned,b.toString('base64'),sha);verifySyntheticSignedPsbt(b,unsigned,pubkey);return finalizeVerifiedProfessionalRelease(unsigned,b.toString('base64'),sha);};",resolveDir:process.cwd(),sourcefile:'Professional/camera-entry.mjs'},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',logLevel:'silent',
 define:{'process.env.NODE_ENV':'"production"','process.browser':'true'},
 inject:['Professional/browser-process-shim.cjs','Professional/browser-buffer-shim.cjs']});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>requests.push(r.url()));
 await page.setContent('<!doctype html><html><body><video id="v"></video><canvas id="c"></canvas><p id="status"></p><video id="jade-signed-video"></video><canvas id="jade-signed-canvas"></canvas><button id="jade-signed-start">Scan</button><button id="jade-signed-stop">Stop</button><p id="jade-signed-status"></p></body></html>');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.waitForTimeout(50);
 const injectedErrors=await page.evaluate(()=>({receiver:typeof window.makeJadeReceiver,attach:typeof window.attachRecipientRelease,verify:typeof window.verifyJadeReturn}));
 if(injectedErrors.receiver!=='function')throw Error('Camera bundle failed to initialize; browser page errors: '+JSON.stringify(errors)+'; handlers: '+JSON.stringify(injectedErrors));
 const browserErrors=await page.evaluate(()=>({receiver:typeof window.makeJadeReceiver,attach:typeof window.attachRecipientRelease,verify:typeof window.verifyJadeReturn}));
 assert.deepEqual(browserErrors,{receiver:'function',attach:'function',verify:'function'},'Browser entry must initialize its exposed handlers');
 await page.evaluate(()=>{
  const video=document.querySelector('#v'),canvas=document.querySelector('#c');
  const source=document.createElement('canvas');source.width=650;source.height=650;
  window.__source=source;
  Object.defineProperty(video,'readyState',{get:()=>4});
  Object.defineProperty(video,'videoWidth',{get:()=>650});
  Object.defineProperty(video,'videoHeight',{get:()=>650});
  video.play=async()=>{};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>new MediaStream()}});
  const ctx=canvas.getContext('2d');
  ctx.drawImage=()=>{};
  ctx.getImageData=()=>source.getContext('2d').getImageData(0,0,650,650);
  window.__received=null;
  window.__receiver=window.makeJadeReceiver({video,canvas,onStatus:s=>document.querySelector('#status').textContent=s,
   onSignedPsbt:async bytes=>{window.__finalized=window.verifyJadeReturn(bytes,window.__unsigned,window.__sha,window.__pubkey);window.__received=Array.from(bytes);}});
 });
 // Hold the first QR image stable until the receiver actually observes it.
 await page.evaluate(async data=>{
  const img=new Image();img.src=data;await img.decode();
  window.__source.getContext('2d').drawImage(img,0,0,650,650);
 },qrImages[0]);
 await page.evaluate(({unsigned,sha,pubkey})=>{window.__unsigned=unsigned;window.__sha=sha;window.__pubkey=pubkey;},{unsigned:handoff.unsignedPsbtBase64,sha:unsignedSha,pubkey:handoff.signerPubkeyHex});
 await page.evaluate(()=>window.__receiver.start());
 // Replay the original frames until the fountain decoder reports completion.
 // Camera polling is asynchronous; a single pass can miss a displayed frame.
 for(let attempt=0;attempt<5;attempt++){
  for(const src of qrImages){
   await page.evaluate(async data=>{
    const img=new Image();img.src=data;await img.decode();
    const ctx=window.__source.getContext('2d');ctx.clearRect(0,0,650,650);ctx.drawImage(img,0,0,650,650);
   },src);
   await page.waitForTimeout(450);
   if(await page.evaluate(()=>window.__receiver.completed))break;
  }
  if(await page.evaluate(()=>window.__receiver.completed))break;
 }
 await page.waitForFunction(()=>window.__receiver.completed,null,{timeout:6000});
 const raw=Buffer.from(await page.evaluate(()=>window.__received));
 assert.deepEqual(raw,expectedSigned,'Camera must reconstruct the exact signed PSBT verified independently');
 assert.equal(raw.subarray(0,5).toString('hex'),'70736274ff');
 const finalizedInBrowser=await page.evaluate(()=>window.__finalized);
 assert.equal(finalizedInBrowser.txid,verified.txid);
 assert.equal(finalizedInBrowser.rawTransactionHex,verified.rawTransactionHex);
 assert.equal(finalizedInBrowser.finalized,true);
 assert.equal(finalizedInBrowser.broadcast,false);
 // Exercise the actual recipient integration, not merely a test-only callback.
 await page.evaluate(({unsigned,pubkey})=>{
  const video=document.getElementById('jade-signed-video');
  const canvas=document.getElementById('jade-signed-canvas');
  Object.defineProperty(video,'readyState',{get:()=>4});
  Object.defineProperty(video,'videoWidth',{get:()=>650});
  Object.defineProperty(video,'videoHeight',{get:()=>650});
  video.play=async()=>{};
  const ctx=canvas.getContext('2d');
  ctx.drawImage=()=>{};
  ctx.getImageData=()=>window.__source.getContext('2d').getImageData(0,0,650,650);
  window.__recipientResult=null;
  window.__recipientReceiver=window.attachRecipientRelease({
   root:document,approvedUnsignedPsbtBase64:unsigned,signerPubkeyHex:pubkey,
   onFinalizedRelease:async result=>{window.__recipientResult=result;}
  });
 },{unsigned:handoff.unsignedPsbtBase64,pubkey:handoff.signerPubkeyHex});
 await page.evaluate(async data=>{
  const img=new Image();img.src=data;await img.decode();
  const ctx=window.__source.getContext('2d');ctx.clearRect(0,0,650,650);ctx.drawImage(img,0,0,650,650);
 },qrImages[0]);
 await page.locator('#jade-signed-start').click();
 for(let attempt=0;attempt<5;attempt++){
  for(const src of qrImages){
   await page.evaluate(async data=>{
    const img=new Image();img.src=data;await img.decode();
    const ctx=window.__source.getContext('2d');ctx.clearRect(0,0,650,650);ctx.drawImage(img,0,0,650,650);
   },src);
   await page.waitForTimeout(450);
   if(await page.evaluate(()=>window.__recipientReceiver.completed))break;
  }
  if(await page.evaluate(()=>window.__recipientReceiver.completed))break;
 }
 await page.waitForFunction(()=>window.__recipientReceiver.completed,null,{timeout:6000});
 const recipientResult=await page.evaluate(()=>window.__recipientResult);
 assert.equal(recipientResult.txid,verified.txid,'Actual recipient handler txid must match independently verified gift');
 assert.equal(recipientResult.rawTransactionHex,verified.rawTransactionHex);
 assert.equal(recipientResult.canBroadcast,false);
 assert.equal(recipientResult.beneficiaryAuthorized,false);
 assert.equal(recipientResult.broadcast,false);
 assert.equal(recipientResult.signatureCryptographicallyVerified,true);
 assert.equal(recipientResult.finalized,true);
 assert.match(await page.locator('#jade-signed-status').textContent(),/Jade signature verified and return processed/);
 await page.locator('#jade-signed-stop').click();
 // The exact same QR data must NOT count as completed when the verifier rejects it.
 await page.evaluate(()=>{
  const video=document.querySelector('#v'),canvas=document.querySelector('#c');
  window.__receiver=window.makeJadeReceiver({video,canvas,
   onStatus:s=>document.querySelector('#status').textContent=s,
   onSignedPsbt:async()=>{throw Error('Intentional verification rejection');}});
 });
 await page.evaluate(async data=>{
  const img=new Image();img.src=data;await img.decode();
  const ctx=window.__source.getContext('2d');ctx.clearRect(0,0,650,650);ctx.drawImage(img,0,0,650,650);
 },qrImages[0]);
 await page.evaluate(()=>window.__receiver.start());
 for(let attempt=0;attempt<5;attempt++){
  for(const src of qrImages){
   await page.evaluate(async data=>{
    const img=new Image();img.src=data;await img.decode();
    const ctx=window.__source.getContext('2d');ctx.clearRect(0,0,650,650);ctx.drawImage(img,0,0,650,650);
   },src);
   await page.waitForTimeout(450);
   if((await page.locator('#status').textContent()).includes('Intentional verification rejection'))break;
  }
  if((await page.locator('#status').textContent()).includes('Intentional verification rejection'))break;
 }
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Intentional verification rejection'),null,{timeout:6000});
 assert.equal(await page.evaluate(()=>window.__receiver.completed),false,'Rejected signature cannot complete receiver');
 assert.deepEqual(errors,[]);
 assert.deepEqual(requests,[]);
 console.log('PASS_ACTUAL_JADE_SIGNED_QR_BROWSER_RECIPIENT_FINALIZATION',JSON.stringify({signedFrames:frames.length,decodedBytes:raw.length,txid:verified.txid,broadcast:false}));
}finally{await browser.close();}
