// bc1q21 Professional isolated QR transport rehearsal ONLY.
// Actual QR PNG encode -> pixel decode -> strict frame reassembly -> byte equality.
// This is NOT Jade/Coldcard protocol compatibility and performs NO signing.
// No hardware, seeds, private keys, wallet connections, Bitcoin network or broadcast.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {PNG} from 'pngjs';
import {inspectUnsignedOfflineHandoff} from './offline-qr-handoff-preflight.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const prefix='BC1Q21-PRO-REGTEST-QR-V1';
const framePattern=/^BC1Q21-PRO-REGTEST-QR-V1\|([0-9a-f]{64})\|([1-9][0-9]*)\/([1-9][0-9]*)\|([A-Za-z0-9+/=]+)$/;
export function assembleStrictPublicFrames(frames) {
 assert.ok(Array.isArray(frames)&&frames.length>0&&frames.length<=40);
 let expectedHash=null,total=null;
 const chunks=new Map();
 for(const frame of frames){
  assert.equal(typeof frame,'string');
  const m=frame.match(framePattern);
  if(!m)throw Error('Unrecognized QR transport frame');
  const [,hash,nRaw,tRaw,chunk]=m;
  const n=Number(nRaw),t=Number(tRaw);
  if(!Number.isSafeInteger(n)||!Number.isSafeInteger(t)||t>40||n>t)
   throw Error('Invalid QR sequence');
  if(expectedHash!==null&&expectedHash!==hash)throw Error('Mixed PSBT hashes');
  if(total!==null&&total!==t)throw Error('Mixed QR sequence totals');
  expectedHash=hash;total=t;
  if(chunks.has(n))throw Error('Duplicate QR frame');
  chunks.set(n,chunk);
 }
 if(chunks.size!==total)throw Error('Incomplete QR frame set');
 let b64='';
 for(let i=1;i<=total;i++){if(!chunks.has(i))throw Error('Missing QR frame');b64+=chunks.get(i);}
 const bytes=Buffer.from(b64,'base64');
 if(bytes.toString('base64')!==b64)throw Error('Noncanonical PSBT base64');
 if(sha(bytes)!==expectedHash)throw Error('PSBT integrity mismatch');
 return bytes;
}
export async function qrRoundTripPublicPsbt(packageDir){
 const {review,unsignedPsbtBase64}=await inspectUnsignedOfflineHandoff(packageDir);
 assert.equal(review.network,'regtest');assert.equal(review.signed,false);
 const raw=Buffer.from(unsignedPsbtBase64,'base64');
 assert.equal(sha(raw),review.psbtSha256);
 // Deliberately use multiple modest-size frames; no QR display/device interaction.
 const chunkSize=140;
 const chunks=unsignedPsbtBase64.match(new RegExp('.{1,'+chunkSize+'}','g'))||[];
 assert.ok(chunks.length>1&&chunks.length<=40);
 const frames=chunks.map((chunk,i)=>prefix+'|'+review.psbtSha256+'|'+(i+1)+'/'+chunks.length+'|'+chunk);
 const decoded=[];
 for(const frame of frames){
  const pngBytes=await QRCode.toBuffer(frame,{type:'png',errorCorrectionLevel:'M',margin:4,scale:6});
  const png=PNG.sync.read(pngBytes);
  const result=jsQR(new Uint8ClampedArray(png.data),png.width,png.height,{inversionAttempts:'dontInvert'});
  assert.ok(result,'QR image failed to decode');
  assert.equal(result.data,frame,'Decoded QR pixels differ from original frame');
  decoded.push(result.data);
 }
 const reconstructed=assembleStrictPublicFrames([...decoded].reverse());
 assert.deepEqual(reconstructed,raw,'QR roundtrip changed unsigned PSBT');
 assert.throws(()=>assembleStrictPublicFrames(decoded.slice(1)),/Incomplete/);
 assert.throws(()=>assembleStrictPublicFrames([...decoded,decoded[0]]),/Duplicate/);
 const changed=[...decoded];
 const last=changed[0].slice(-1);
 changed[0]=changed[0].slice(0,-1)+(last==='A'?'B':'A');
 assert.throws(()=>assembleStrictPublicFrames(changed),/integrity|Noncanonical|Unrecognized/);
 return Object.freeze({status:'PASS_SOFTWARE_QR_PIXEL_ROUNDTRIP',network:'regtest',
  frameCount:frames.length,psbtBytes:raw.length,psbtSha256:sha(raw),
  recipientSats:review.recipientSats,feeSats:review.feeSats,
  cltvBlockHeight:review.cltvBlockHeight,hardwareCompatibilityVerified:false,
  signed:false,broadcast:false});
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(!process.argv[2])throw Error('Usage: node offline-qr-public-psbt-roundtrip.mjs <verified-package-dir>');
 const result=await qrRoundTripPublicPsbt(process.argv[2]);
 console.log('PASS_SOFTWARE_QR_PIXEL_ROUNDTRIP',JSON.stringify(result));
 console.log('Custom transport frames only; NOT verified to be Jade or Coldcard compatible; Jade OFF');
}
