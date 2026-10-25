// Browser camera-path regression with seven ORIGINAL Jade signed QR frames.
// Synthetic camera transport only; the QR payloads and funded gift are real regtest evidence.
// No device, keys, remote requests or broadcast.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
assert.equal(frames.length,7,'Original Jade capture must contain seven frames');
const verified=finalizeJadeSignedQrReturn({handoff,frames});
const expectedDecoder=new URDecoder();
for(const frame of frames)expectedDecoder.receivePart(frame);
assert.ok(expectedDecoder.isComplete()&&expectedDecoder.isSuccess());
const expectedSigned=Buffer.from(cbor.decodeFirstSync(Buffer.from(expectedDecoder.resultUR().cbor)));
assert.equal(verified.signatureCryptographicallyVerified,true);
const qrImages=await Promise.all(frames.map(s=>QRCode.toDataURL(s,{errorCorrectionLevel:'L',margin:3,width:650})));
const bundle=await build({stdin:{contents:"import {createJadeSignedCameraReceiver} from './Professional/recipient-jade-signed-camera.browser.mjs'; window.makeJadeReceiver=createJadeSignedCameraReceiver;",resolveDir:process.cwd(),sourcefile:'Professional/camera-entry.mjs'},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',logLevel:'silent',
 define:{'process.env.NODE_ENV':'"production"','process.browser':'true'},
 inject:['Professional/browser-process-shim.cjs','Professional/browser-buffer-shim.cjs']});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>requests.push(r.url()));
 await page.setContent('<!doctype html><html><body><video id="v"></video><canvas id="c"></canvas><p id="status"></p></body></html>');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(()=>{
  const video=document.querySelector('#v'),canvas=document.querySelector('#c');
  const source=document.createElement('canvas');source.width=650;source.height=650;
  window.__source=source;
  Object.defineProperty(video,'readyState',{get:()=>4});
  Object.defineProperty(video,'videoWidth',{get:()=>650});
  Object.defineProperty(video,'videoHeight',{get:()=>650});
  video.play=async()=>{};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
  const ctx=canvas.getContext('2d');
  ctx.drawImage=()=>{};
  ctx.getImageData=()=>source.getContext('2d').getImageData(0,0,650,650);
  window.__received=null;
  window.__receiver=window.makeJadeReceiver({video,canvas,onStatus:s=>document.querySelector('#status').textContent=s,
   onSignedPsbt:async bytes=>{window.__received=Array.from(bytes);}});
 });
 await page.evaluate(()=>window.__receiver.start());
 for(const src of qrImages){
  await page.evaluate(async data=>{
   const img=new Image();img.src=data;await img.decode();
   window.__source.getContext('2d').clearRect(0,0,650,650);
   window.__source.getContext('2d').drawImage(img,0,0,650,650);
  },src);
  await page.waitForTimeout(350);
  if(await page.evaluate(()=>window.__receiver.completed))break;
 }
 await page.waitForFunction(()=>window.__receiver.completed,null,{timeout:6000});
 const raw=Buffer.from(await page.evaluate(()=>window.__received));
 assert.deepEqual(raw,expectedSigned,'Camera must reconstruct the exact signed PSBT verified independently');
 assert.equal(raw.subarray(0,5).toString('hex'),'70736274ff');
 // The exact same QR data must NOT count as completed when the verifier rejects it.
 await page.evaluate(()=>{
  const video=document.querySelector('#v'),canvas=document.querySelector('#c');
  window.__receiver=window.makeJadeReceiver({video,canvas,
   onStatus:s=>document.querySelector('#status').textContent=s,
   onSignedPsbt:async()=>{throw Error('Intentional verification rejection');}});
 });
 await page.evaluate(()=>window.__receiver.start());
 for(const src of qrImages){
  await page.evaluate(async data=>{
   const img=new Image();img.src=data;await img.decode();
   const ctx=window.__source.getContext('2d');ctx.clearRect(0,0,650,650);ctx.drawImage(img,0,0,650,650);
  },src);
  await page.waitForTimeout(350);
  if((await page.locator('#status').textContent()).includes('Intentional verification rejection'))break;
 }
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Intentional verification rejection'),null,{timeout:6000});
 assert.equal(await page.evaluate(()=>window.__receiver.completed),false,'Rejected signature cannot complete receiver');
 assert.deepEqual(errors,[]);
 assert.deepEqual(requests,[]);
 console.log('PASS_ACTUAL_JADE_SIGNED_QR_BROWSER_CAMERA_DECODE',JSON.stringify({signedFrames:frames.length,decodedBytes:raw.length,txid:verified.txid,broadcast:false}));
}finally{await browser.close();}
