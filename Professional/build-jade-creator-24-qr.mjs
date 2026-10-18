import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {UR,URDecoder,UREncoder} from '@ngraveio/bc-ur';
import cbor from 'cbor';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {PNG} from 'pngjs';
const [source,target]=process.argv.slice(2);
assert.ok(source&&target);
const gift=JSON.parse(readFileSync(source,'utf8'));
assert.equal(gift.format,'bc1q21-professional-creator-24-jade-public-unsigned-v1');
assert.equal(gift.network,'regtest');
assert.equal(gift.unsigned,true);
assert.equal(gift.broadcast,false);
assert.equal(gift.recipientOutputs.length,24);\nassert.equal(gift.creatorFingerprint,'e29ac13c');\nassert.equal(gift.creatorPath,\"m/84'/0'/0'/0/0\");\nassert.equal(gift.creatorInputSats,1000000);\nassert.equal(gift.recipientOutputs.reduce((a,o)=>a+o.sats,0)+gift.changeSats+gift.feeSats,gift.creatorInputSats);
const psbt=Buffer.from(gift.psbtBase64,'base64');
assert.equal(psbt.subarray(0,5).toString('hex'),'70736274ff');
assert.equal(createHash('sha256').update(psbt).digest('hex'),gift.psbtSha256);
const encoder=new UREncoder(new UR(cbor.encode(psbt),'crypto-psbt'),80,0);
assert.ok(encoder.fragmentsLength>=1&&encoder.fragmentsLength<=512);
const frames=[],images=[];
for(let i=0;i<encoder.fragmentsLength;i++){
 const frame=encoder.nextPart();
 const bytes=await QRCode.toBuffer(frame,{type:'png',errorCorrectionLevel:'M',margin:4,scale:5});
 const png=PNG.sync.read(bytes);
 const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
 assert.ok(decoded,'QR pixel decode failed');
 assert.equal(decoded.data.toLowerCase(),frame.toLowerCase());
 frames.push(frame);
 images.push('data:image/png;base64,'+bytes.toString('base64'));
}
const decoder=new URDecoder();
for(const frame of [...frames].reverse())decoder.receivePart(frame);
assert.ok(decoder.isComplete()&&decoder.isSuccess());
assert.equal(decoder.resultUR().type,'crypto-psbt');
assert.deepEqual(cbor.decodeFirstSync(Buffer.from(decoder.resultUR().cbor)),psbt);
const page=['<!doctype html><html><head><meta charset="utf-8">',
'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'none\'">',
'<title>bc1q21 Professional creator test QR</title>',
'<style>body{font:16px system-ui;background:#17283d;color:white;max-width:800px;margin:30px auto;padding:15px}img{width:480px;max-width:100%;background:white}button{padding:12px;margin:8px}</style>',
'</head><body><h1>bc1q21 Professional — 24-release creator funding</h1>',
'<p>DISPOSABLE REGTEST ONLY. UNSIGNED. NO REAL BITCOIN. DO NOT SCAN UNTIL AUTHORIZED.</p>',
'<p>One transaction, 24 CLTV recipient outputs and Jade-public creator change. No private material.</p>',
'<p>PSBT SHA-256: '+gift.psbtSha256+'</p>',
'<p>QR frames: '+frames.length+'. Hardware acceptance and approval count are not yet tested.</p>',
'<img id="qr" alt="QR frame"><p id="status"></p>',
'<button onclick="move(-1)">Previous</button><button onclick="move(1)">Next</button><button onclick="toggle()" id="toggle">Start animation</button>',
'<script>const frames='+JSON.stringify(images)+';let i=0,t=null;',
'function show(){document.getElementById("qr").src=frames[i];document.getElementById("status").textContent="Frame "+(i+1)+" of "+frames.length}',
'function move(n){if(t){clearInterval(t);t=null}i=(i+n+frames.length)%frames.length;show()}',
'function toggle(){if(t){clearInterval(t);t=null;document.getElementById("toggle").textContent="Start animation"}else{t=setInterval(()=>{i=(i+1)%frames.length;show()},1500);document.getElementById("toggle").textContent="Pause animation"}}show();',
'</script></body></html>'].join('');
writeFileSync(target,page,{mode:0o600});
console.log('PASS_CREATOR_24_QR_ROUNDTRIP',JSON.stringify({frames:frames.length,psbtBytes:psbt.length,sha256:gift.psbtSha256,hardwareScanned:false}));
