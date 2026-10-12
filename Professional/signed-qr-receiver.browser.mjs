// Offline browser receiver for signed crypto-psbt fountain QR frames.
// Disposable Jade signer and synthetic fixture ONLY. No broadcast or secrets.
import jsQR from 'jsqr';
import { URDecoder } from '@ngraveio/bc-ur';
import bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'buffer';

const $ = id => document.getElementById(id);
const status = message => { $('status').textContent = message; };
let stream, running = false, decoder, seen, lastRead = 0, expected;
function stopCamera() {
  running = false;
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = undefined;
  $('start').disabled = false;
  $('stop').disabled = true;
}
function reset() {
  decoder = new URDecoder();
  seen = new Set();
  $('download').hidden = true;
  $('summary').textContent = '';
  status('Ready to scan signed QR frames.');
}
function verifyEnvelope(raw) {
  const psbt = bitcoin.Psbt.fromBuffer(raw);
  const original = bitcoin.Psbt.fromBase64(expected.psbtBase64);
  if (psbt.txInputs.length !== 1 || psbt.txOutputs.length !== 1)
    throw Error('Unexpected transaction input/output count');
  if (!psbt.data.globalMap.unsignedTx.toBuffer().equals(original.data.globalMap.unsignedTx.toBuffer()))
    throw Error('Unsigned transaction changed: reject signed PSBT');
  const meta = psbt.data.inputs[0], base = original.data.inputs[0];
  if (!meta.nonWitnessUtxo || !Buffer.from(meta.nonWitnessUtxo).equals(Buffer.from(base.nonWitnessUtxo)))
    throw Error('Funding transaction changed');
  if (!meta.redeemScript || !Buffer.from(meta.redeemScript).equals(Buffer.from(base.redeemScript)))
    throw Error('Redeem script changed');
  const sigs = meta.partialSig || [];
  if (sigs.length !== 1 || !Buffer.from(sigs[0].pubkey).equals(Buffer.from(expected.signerPubkeyHex, 'hex')))
    throw Error('Missing or unexpected signer partial signature');
  if (!Buffer.from(sigs[0].signature).length)
    throw Error('Empty signature');
  return { psbt, sigs };
}
function finish() {
  stopCamera();
  if (!decoder.isSuccess()) { status('UR decoding failed. Reset and retry.'); return; }
  try {
    const ur = decoder.resultUR();
    if (ur.type !== 'crypto-psbt') throw Error('Unexpected UR type: ' + ur.type);
    const raw = Buffer.from(ur.decodeCBOR());
    if (raw.length > 100000 || raw.subarray(0, 5).toString('hex') !== '70736274ff')
      throw Error('Invalid PSBT payload');
    const { sigs } = verifyEnvelope(raw);
    const blob = new Blob([raw], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = $('download');
    a.href = url; a.hidden = false;
    a.onclick = () => setTimeout(() => URL.revokeObjectURL(url), 15000);
    $('summary').textContent = 'Matching synthetic transaction; ' + sigs.length +
      ' partial signature detected. Signature authenticity NOT YET verified. No broadcast performed.';
    status('Captured signed PSBT. Download for independent cryptographic verification.');
  } catch (err) {
    status('REJECTED: ' + err.message);
  }
}
async function scan() {
  if (!running) return;
  const video = $('video');
  if (video.readyState >= 2 && video.videoWidth) {
    const canvas = $('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(pixels.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
    if (code && /^ur:crypto-psbt\//i.test(code.data) && !seen.has(code.data)) {
      seen.add(code.data);
      try {
        decoder.receivePart(code.data);
        status('Reading Jade frames: ' + seen.size + ' distinct QR frames received.');
        if (decoder.isComplete()) { finish(); return; }
      } catch (err) { status('Frame rejected: ' + err.message); }
    }
  }
  setTimeout(scan, 100);
}
async function start() {
  reset();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    $('video').srcObject = stream;
    await $('video').play();
    running = true;
    $('start').disabled = true; $('stop').disabled = false;
    status('Camera active. Point it at the Jade Plus animated QR display.');
    scan();
  } catch (err) {
    stopCamera();
    status('Camera unavailable: ' + err.message + '. Check Brave camera permission or try another browser.');
  }
}
expected = JSON.parse($('fixture').textContent);
reset();
$('start').onclick = start;
$('stop').onclick = () => { stopCamera(); status('Camera stopped.'); };
$('reset').onclick = () => { stopCamera(); reset(); };
