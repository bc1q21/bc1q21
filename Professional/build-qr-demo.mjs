// Generate a fully self-contained OFFLINE HTML animation of UR:CRYPTO-PSBT QR frames.
// Only for synthetic Professional test data. Never accepts secrets, never broadcasts.
// Usage: node Professional/build-qr-demo.mjs [output.html]
// Requires @ngraveio/bc-ur and qrcode in local Professional test dependencies.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import QRCode from 'qrcode';
import { buildUnsignedCltvPsbt } from './unsigned-cltv-psbt.mjs';
import { makeCryptoPsbtFrames } from './crypto-psbt-frames.mjs';
import { prepareUnsignedPsbtForQr } from './qr-handoff.mjs';

const hash = (alg, b) => createHash(alg).update(b).digest();
const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const u64 = n => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const pub = Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd', 'hex');
const redeem = Buffer.concat([Buffer.from([1,110,0xb1,0x75,33]), pub, Buffer.from([0xac])]);
const p2sh = Buffer.concat([Buffer.from([0xa9,20]), hash('ripemd160',hash('sha256',redeem)), Buffer.from([0x87])]);
const funding = Buffer.concat([u32(2),Buffer.from([1]),Buffer.alloc(32,1),u32(0),Buffer.from([0]),u32(0xffffffff),Buffer.from([1]),u64(100000),Buffer.from([23]),p2sh,u32(0)]);
const txid = Buffer.from(hash('sha256',hash('sha256',funding))).reverse().toString('hex');
const psbt = buildUnsignedCltvPsbt({
 fundingTxHex: funding.toString('hex'),vout:0,expectedTxid:txid,expectedSats:100000,
 redeemScriptHex:redeem.toString('hex'),signerPubkeyHex:pub.toString('hex'),
 masterFingerprintHex:'e29ac13c',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 locktime:110,destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000
});
const checked = prepareUnsignedPsbtForQr(psbt.psbtBase64, psbt.summary);
const frames = makeCryptoPsbtFrames(checked.psbtBytes, { fragmentLength: 120, frameCount: 48 });
const images = await Promise.all(frames.map(frame => QRCode.toDataURL(frame, {
 errorCorrectionLevel:'L', margin:3, width:420
})));
const safeJSON = value => JSON.stringify(value).replace(/</g,'\\u003c');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>bc1q21 Professional — synthetic QR transport demo</title>
<style>body{margin:0;background:#101820;color:#f4f6fa;font:16px system-ui,sans-serif}
main{max-width:660px;margin:28px auto;padding:20px;text-align:center}
h1{font-size:1.5rem}p{line-height:1.5}.warn{background:#50391d;border:1px solid #d5a050;padding:12px;border-radius:8px}
img{display:block;width:min(100%,420px);height:auto;margin:18px auto;background:white;border-radius:8px}
button{font:inherit;padding:10px 18px;margin:4px;border-radius:8px;cursor:pointer}
small{color:#c6ceda;display:block;overflow-wrap:anywhere}</style></head><body><main>
<h1>bc1q21 Professional — QR transport demonstration</h1>
<p class="warn"><strong>SYNTHETIC / UNFUNDED TEST ONLY.</strong> This page cannot sign or broadcast Bitcoin. Do not use with real funds or your original Jade wallet.</p>
<p>These QR codes contain a synthetic unsigned PSBT in animated <code>ur:crypto-psbt</code> format. For hardware experiments use only the disposable Jade test signer.</p>
<img id="qr" alt="Animated unsigned PSBT QR frame"><div id="count" aria-live="off"></div>
<button id="toggle">Pause</button><button id="slower">Slower</button><button id="faster">Faster</button>
<p><small>Offline standalone file. No network requests, camera, wallet secrets, or production website connection.</small></p>
</main><script>
const images=${safeJSON(images)};let i=0,delay=400,playing=true,timer;
const image=document.getElementById('qr'),count=document.getElementById('count');
function show(){image.src=images[i];count.textContent='Frame '+(i+1)+' / '+images.length;i=(i+1)%images.length;}
function tick(){if(!playing)return;show();timer=setTimeout(tick,delay);}
function restart(){clearTimeout(timer);if(playing)tick();}
document.getElementById('toggle').onclick=()=>{playing=!playing;document.getElementById('toggle').textContent=playing?'Pause':'Play';restart();};
document.getElementById('slower').onclick=()=>{delay=Math.min(1500,delay+100);restart();};
document.getElementById('faster').onclick=()=>{delay=Math.max(150,delay-100);restart();};
tick();
</script></body></html>`;
const output=resolve(process.argv[2] ?? 'Professional/synthetic-jade-qr-demo.html');
writeFileSync(output,html,{flag:'w',mode:0o600});
console.log('Created offline synthetic QR animation:',output,'frames:',frames.length,'size:',html.length);
