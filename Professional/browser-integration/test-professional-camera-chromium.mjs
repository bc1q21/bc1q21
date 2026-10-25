// Real Chromium camera decoder integration using a virtual camera backed by
// QR images of the captured physical Jade Plus signature. No hardware, secrets or broadcast.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import QRCode from 'qrcode';
import {chromium} from 'playwright';
const frames=readFileSync('../fixtures/calendar-release1-physical-jade-signed-qr-20261025.txt','utf8')
 .split(/\r?\n/).map(s=>s.trim()).filter(s=>/^ur:crypto-psbt\//i.test(s));
assert.ok(frames.length>=8,'Physical Jade fixture missing');
const images=await Promise.all(frames.map(frame=>QRCode.toDataURL(frame,{margin:5,width:640,errorCorrectionLevel:'M'})));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const cameraErrors=[];
 page.on('pageerror',error=>cameraErrors.push(error.message));
 const external=[];
 await page.route('**/*',route=>{
  if(route.request().url().startsWith('file:'))return route.continue();
  external.push(route.request().url());return route.abort();
 });
 await page.goto(pathToFileURL(resolve('professional-verification-diagnostic.html')).href);
 await page.waitForFunction(()=>typeof globalThis.bc1q21ProfessionalAttachCamera==='function');
 await page.evaluate(async images=>{
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
  const context=canvas.getContext('2d');
  const qrImages=await Promise.all(images.map(src=>new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;
  })));
  window.__sourceCanvas=canvas;
  const stream=canvas.captureStream(15);
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:async()=>stream
  }});
  let frame=0;
  function draw(){
   context.fillStyle='#fff';context.fillRect(0,0,640,640);
   context.drawImage(qrImages[frame%qrImages.length],0,0,640,640);
   frame++;
  }
  draw();window.__qrTimer=setInterval(draw,350);
 },images);
 // Delay camera permission, cancel, then deliver the permission response.
 // The stale stream must be stopped and must not restart scanning.
 await page.evaluate(()=>{
  const real=navigator.mediaDevices.getUserMedia;
  window.__permissionResolve=null;
  navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{window.__permissionResolve=()=>resolve(real());});
 });
 await page.locator('#jade-start').click();
 await page.waitForFunction(()=>typeof window.__permissionResolve==='function');
 await page.locator('#jade-stop').click();
 await page.evaluate(()=>window.__permissionResolve());
 await page.waitForTimeout(200);
 assert.equal(await page.locator('#status').getAttribute('data-state'),'idle',
  'Late camera permission must not restore approval');
 assert.equal(await page.locator('#jade-stop').isDisabled(),true,
  'Late camera permission must not restart scanning');
 await page.evaluate(()=>{
  navigator.mediaDevices.getUserMedia=async()=>window.__sourceCanvas.captureStream(15);
 });
 await page.locator('#jade-start').click();
 await page.waitForFunction(()=>document.querySelector('#status').dataset.state==='pass',{timeout:30000});
 assert.match(await page.locator('#status').innerText(),/VERIFIED: Jade camera signature/);
 assert.equal(await page.locator('#jade-stop').isDisabled(),true);
 assert.deepEqual(external,[],'Camera verification must make no network requests');
 assert.deepEqual(cameraErrors,[],'Camera verifier must not throw uncaught browser errors');
 // A second scan must revoke the previous success immediately.
 await page.locator('#jade-start').click();
 assert.equal(await page.locator('#status').getAttribute('data-state'),'idle',
  'Starting another scan must revoke prior verification');
 await page.locator('#jade-stop').click();
 assert.equal(await page.locator('#status').getAttribute('data-state'),'idle',
  'Stopping a scan must never preserve verified state');
 // Stale signed results from the previous session must not restore green status.
 assert.notEqual(await page.locator('#status').getAttribute('data-state'),'pass');
 await page.evaluate(()=>{clearInterval(window.__qrTimer);});
 console.log('PASS: real Chromium camera path decoded animated physical Jade QR, verified signature and transaction, no network/broadcast');
}finally{await browser.close();}
