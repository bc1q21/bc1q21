// Build a single-file offline QR receiver for the synthetic Jade fixture.
// It does not sign, finalize or broadcast Bitcoin.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { buildUnsignedCltvPsbt } from './unsigned-cltv-psbt.mjs';
const hash=(alg,b)=>createHash(alg).update(b).digest();
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;};
const pub=Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd','hex');
const redeem=Buffer.concat([Buffer.from([1,110,0xb1,0x75,33]),pub,Buffer.from([0xac])]);
const p2sh=Buffer.concat([Buffer.from([0xa9,20]),hash('ripemd160',hash('sha256',redeem)),Buffer.from([0x87])]);
const funding=Buffer.concat([u32(2),Buffer.from([1]),Buffer.alloc(32,1),u32(0),Buffer.from([0]),u32(0xffffffff),Buffer.from([1]),u64(100000),Buffer.from([23]),p2sh,u32(0)]);
const txid=Buffer.from(hash('sha256',hash('sha256',funding))).reverse().toString('hex');
const fixture=buildUnsignedCltvPsbt({fundingTxHex:funding.toString('hex'),vout:0,expectedTxid:txid,expectedSats:100000,redeemScriptHex:redeem.toString('hex'),signerPubkeyHex:pub.toString('hex'),masterFingerprintHex:'e29ac13c',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],locktime:110,destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000});
const result=await build({entryPoints:['Professional/signed-qr-receiver.browser.mjs'],bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',minify:true,define:{'process.env.NODE_ENV':'"production"','process.browser':'true'},inject:['Professional/browser-process-shim.cjs','Professional/browser-buffer-shim.cjs'],logLevel:'warning'});
const polyfill=await build({stdin:{contents:"import { Buffer } from 'buffer'; globalThis.Buffer = Buffer;",resolveDir:resolve('Professional'),sourcefile:'receiver-buffer-init.mjs',loader:'js'},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',minify:true,logLevel:'warning'});
const js=(polyfill.outputFiles[0].text + "\\nvar process = { browser: true, env: { NODE_ENV: 'production' }, version: '', versions: {}, nextTick: (fn, ...args) => queueMicrotask(() => fn(...args)) };\\n" + result.outputFiles[0].text).replaceAll('</script', '<\\\\/script');
const safe=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bc1q21 Professional — Jade signed QR receiver</title>
<style>body{background:#101820;color:#f4f6fa;font:16px system-ui,sans-serif;margin:0}main{max-width:680px;margin:28px auto;padding:18px}h1{font-size:1.5rem}p{line-height:1.5}.warn{background:#50391d;border:1px solid #d5a050;padding:12px;border-radius:8px}video{width:100%;max-height:460px;background:#000;border-radius:8px}button,a{font:inherit;margin:6px 4px 6px 0;padding:10px 14px}#status{font-weight:bold}small{color:#c6ceda}</style></head><body><main>
<h1>bc1q21 Professional — signed PSBT QR receiver</h1>
<p class="warn"><strong>SYNTHETIC / UNFUNDED TEST ONLY.</strong> Use only disposable Jade test signer. No wallet seeds, private keys, signing, broadcasting or production connection.</p>
<p>Use a camera connected to this computer to read the Jade Plus animated response. Camera permission may require a secure localhost browser context.</p>
<video id="video" autoplay muted playsinline></video><canvas id="canvas" hidden></canvas>
<div><button id="start">Start camera</button><button id="stop" disabled>Stop camera</button><button id="reset">Reset</button></div>
<p id="status" role="status"></p><p id="summary"></p><a id="download" download="jade-synthetic-signed.psbt" hidden>Download captured PSBT</a>
<p><small>Offline self-contained HTML; no remote assets or network calls. Captured PSBT is not broadcast. Cryptographic signature verification remains a separate step.</small></p>
</main><script type="application/json" id="fixture">${safe({psbtBase64:fixture.psbtBase64,signerPubkeyHex:fixture.summary.signerPubkeyHex})}</script>
<script>${js}</script></body></html>`;
const output=resolve(process.argv[2]??'Professional/synthetic-jade-signed-qr-receiver.html');
writeFileSync(output,html,{mode:0o600});console.log('Created offline synthetic signed QR receiver',output,html.length,'bytes');
