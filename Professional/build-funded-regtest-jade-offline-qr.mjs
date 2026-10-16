// bc1q21 Professional: disposable public-only regtest QR display generator.
// Requires the verified regtest package and Professional's pinned test dependencies.
// No wallet, seed, private key, hardware access, transaction signing, or broadcasting.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { UR, URDecoder, UREncoder } from '@ngraveio/bc-ur';
import cbor from 'cbor';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { inspectUnsignedOfflineHandoff } from './offline-qr-handoff-preflight.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const htmlEscape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export async function buildFundedRegtestOfflineQr(packageDir, outputFile) {
  const { review, unsignedPsbtBase64 } = await inspectUnsignedOfflineHandoff(packageDir);
  assert.equal(review.network, 'regtest');
  assert.equal(review.signed, false);
  assert.equal(review.broadcast, false);
  assert.equal(review.psbtBytes, 313);
  assert.equal(review.fundingSats, 100000);
  assert.equal(review.recipientSats, 99000);
  assert.equal(review.feeSats, 1000);
  assert.equal(review.cltvBlockHeight, 110);
  const original = Buffer.from(unsignedPsbtBase64, 'base64');
  assert.equal(sha256(original), review.psbtSha256);

  const encoder = new UREncoder(new UR(cbor.encode(original), 'crypto-psbt'), 41, 0);
  const frames = [];
  const images = [];
  for (let index = 0; index < encoder.fragmentsLength; index++) {
    const frame = encoder.nextPart();
    const pngBytes = await QRCode.toBuffer(frame, { type: 'png', errorCorrectionLevel: 'M', margin: 4, scale: 6 });
    const png = PNG.sync.read(pngBytes);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: 'dontInvert' });
    assert.ok(decoded, 'Generated QR image must be decodable');
    assert.equal(decoded.data.toLowerCase(), frame.toLowerCase(), 'QR pixels must match the UR frame');
    frames.push(frame);
    images.push('data:image/png;base64,' + pngBytes.toString('base64'));
  }
  assert.equal(frames.length, 8, 'Expected eight BC-UR frames for this exact funded-regtest PSBT');
  const decoder = new URDecoder();
  for (const frame of [...frames].reverse()) decoder.receivePart(frame);
  assert.equal(decoder.isComplete(), true, 'Fountain decoder incomplete');
  assert.equal(decoder.isSuccess(), true, 'Fountain decoder rejected frames');
  assert.equal(decoder.resultUR().type, 'crypto-psbt');
  assert.deepEqual(cbor.decodeFirstSync(Buffer.from(decoder.resultUR().cbor)), original);

  const fields = [
    ['Network', review.network],
    ['Funding outpoint', review.fundingOutpoint],
    ['Funding amount', review.fundingSats + ' test sats'],
    ['Recipient address', review.recipientAddress],
    ['Recipient amount', review.recipientSats + ' test sats'],
    ['Fee', review.feeSats + ' test sats'],
    ['CLTV block height', review.cltvBlockHeight],
    ['Transaction locktime', review.transactionLocktime],
    ['Input sequence', review.inputSequence],
    ['Signer fingerprint', review.signerMasterFingerprint],
    ['Signer derivation', review.signerDerivationPath],
    ['Unsigned PSBT SHA-256', review.psbtSha256]
  ];
  const rows = fields.map(([key, value]) => '<tr><th>' + htmlEscape(key) + '</th><td>' + htmlEscape(value) + '</td></tr>').join('\n');
  const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>bc1q21 Professional — offline regtest QR test</title>
<style>body{font:17px system-ui,sans-serif;max-width:820px;margin:20px auto;padding:20px;background:#152235;color:#f4f7fb}h1{font-size:1.55rem}.warning{padding:16px;border:2px solid #f99;background:#5c1721;font-weight:bold}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #9aa9ba;padding:9px;text-align:left;overflow-wrap:anywhere}th{width:31%}#viewer{text-align:center;margin-top:24px}img{width:477px;max-width:95%;background:#fff;image-rendering:pixelated}button{padding:10px 15px;margin:8px;font-size:17px}#status{font-weight:bold}</style></head><body>
<h1>bc1q21 Professional — offline Jade QR rehearsal</h1>
<p class="warning">DISPOSABLE REGTEST ONLY. NO REAL BITCOIN. UNSIGNED. NOT BROADCAST. JADE PLUS MUST REMAIN OFF UNTIL SEPARATELY AUTHORIZED.</p>
<h2>Review transaction details before any future hardware test</h2>
<table>${rows}</table>
<p>Eight BC-UR crypto-psbt QR frames generated from the verified public-only regtest transaction. Hardware acceptance of these frames has NOT been tested.</p>
<div id="viewer"><p id="status">Frame 1 of 8 — paused</p><img id="qr" alt="Offline unsigned regtest PSBT QR frame" src="${images[0]}"></div>
<div><button type="button" id="previous">Previous frame</button><button type="button" id="next">Next frame</button><button type="button" id="toggle">Start animation</button></div>
<p>Animation advances every 1.5 seconds. It starts paused. All images are embedded; this page has no network connections.</p>
<script>
'use strict';
const images = ${JSON.stringify(images)};
let index = 0, timer = null;
const qr = document.getElementById('qr');
const status = document.getElementById('status');
const toggle = document.getElementById('toggle');
function show() { qr.src = images[index]; status.textContent = 'Frame ' + (index + 1) + ' of ' + images.length + (timer === null ? ' — paused' : ' — animating'); }
function stop() { if (timer !== null) { clearInterval(timer); timer = null; } toggle.textContent = 'Start animation'; show(); }
document.getElementById('previous').addEventListener('click', () => { stop(); index = (index + images.length - 1) % images.length; show(); });
document.getElementById('next').addEventListener('click', () => { stop(); index = (index + 1) % images.length; show(); });
toggle.addEventListener('click', () => { if (timer !== null) { stop(); return; } timer = setInterval(() => { index = (index + 1) % images.length; show(); }, 1500); toggle.textContent = 'Pause animation'; show(); });
show();
</script></body></html>`;
  assert.ok(!/https?:\/\//i.test(page), 'Offline page must not contain external URLs');
  writeFileSync(outputFile, page, { mode: 0o600 });
  return Object.freeze({ result: 'PASS_OFFLINE_REGTEST_QR_PAGE_GENERATED', frameCount: frames.length, psbtSha256: review.psbtSha256, htmlSha256: sha256(Buffer.from(page)), unsigned: true, broadcast: false, hardwareScanned: false });
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  assert.equal(process.argv.length, 4, 'Usage: node build-funded-regtest-jade-offline-qr.mjs <verified-package-dir> <output.html>');
  console.log(JSON.stringify(await buildFundedRegtestOfflineQr(process.argv[2], process.argv[3])));
}
