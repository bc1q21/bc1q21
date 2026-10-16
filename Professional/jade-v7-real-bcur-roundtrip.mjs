// Genuine BC-UR / Bytewords / fountain regression for public-only Jade V7 reference.
// Tests original captured UR parts AND separately funded regtest unsigned PSBT.
// This is software-only. It does not certify Jade hardware signing compatibility.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {UR,URDecoder,UREncoder} from '@ngraveio/bc-ur';
import cbor from 'cbor';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {PNG} from 'pngjs';
import {inspectUnsignedOfflineHandoff} from './offline-qr-handoff-preflight.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
function decodeFrames(frames){
 const decoder=new URDecoder();
 for(const frame of frames)decoder.receivePart(frame);
 assert.equal(decoder.isComplete(),true,'BC-UR fountain reconstruction incomplete');
 assert.equal(decoder.isSuccess(),true,'BC-UR fountain decode failed');
 const ur=decoder.resultUR();
 assert.equal(ur.type,'crypto-psbt');
 const decoded=cbor.decodeFirstSync(Buffer.from(ur.cbor));
 assert.ok(Buffer.isBuffer(decoded),'crypto-psbt CBOR payload must be byte string');
 return decoded;
}
async function pixelRoundTrip(frame){
 const png=PNG.sync.read(await QRCode.toBuffer(frame,{type:'png',errorCorrectionLevel:'M',margin:4,scale:6}));
 const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height,{inversionAttempts:'dontInvert'});
 assert.ok(decoded,'QR pixel decode failed');
 assert.equal(decoded.data.toLowerCase(),frame.toLowerCase(),'QR pixels did not match UR text');
 return decoded.data;
}
const reference=JSON.parse(readFileSync(new URL('./jade-v7-ur-reference-frames.json',import.meta.url),'utf8'));
let original;
try {
 original=decodeFrames(reference.frames);
} catch(e) {
 if(/Invalid Checksum/i.test(String(e))) {
  console.error('FAIL_REFERENCE_BCUR_CHECKSUM: original V7 literal frame data did not pass Bytewords CRC; refusing to call protocol verified');
  console.error('Reference checksums must be validated against original QR image pixels and frame strings, not disabled.');
 }
 throw e;
}
assert.equal(original.length,283,'Original V7 decoded PSBT length');
assert.equal(digest(original),reference.syntheticUnsignedPsbtSha256,'Original V7 decoded PSBT fingerprint');
const packageDir=process.argv[2];
if(!packageDir)throw Error('Usage: node jade-v7-real-bcur-roundtrip.mjs <verified-regtest-package>');
const {review,unsignedPsbtBase64}=await inspectUnsignedOfflineHandoff(packageDir);
const funded=Buffer.from(unsignedPsbtBase64,'base64');
assert.equal(funded.length,313);
assert.equal(digest(funded),review.psbtSha256);
// CBOR byte string wrapper mandated by crypto-psbt UR registry type.
const ur=new UR(cbor.encode(funded),'crypto-psbt');
const encoder=new UREncoder(ur,41,0);
const frames=[];
for(let i=0;i<encoder.fragmentsLength;i++)frames.push(encoder.nextPart());
assert.ok(frames.length>=7&&frames.length<=40,'Unexpected funded regtest UR frame count');
const pixelFrames=[];
for(const frame of frames)pixelFrames.push(await pixelRoundTrip(frame));
const restored=decodeFrames([...pixelFrames].reverse());
assert.deepEqual(restored,funded,'BC-UR decoded funded PSBT differs');
assert.throws(()=>decodeFrames(pixelFrames.slice(1)),/incomplete/);
console.log('PASS_REAL_BCUR_JADE_V7_REFERENCE_AND_FUNDED_REGTEST',JSON.stringify({
 originalV7Frames:reference.frames.length,originalV7Bytes:original.length,
 fundedRegtestFrames:frames.length,fundedRegtestBytes:funded.length,
 fundedPsbtSha256:digest(funded),qrPixelsVerified:true,
 deviceScannedFundedFrames:false,hardwareSigned:false,broadcast:false
}));
