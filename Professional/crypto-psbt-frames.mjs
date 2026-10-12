// Isolated bc1q21 Professional: BC-UR crypto-psbt fountain frames.
// Output is QR *payload text* only; no display, camera, device, keys or network.
// Requires @ngraveio/bc-ur@1.1.13 in the test environment.
import { UR, UREncoder } from '@ngraveio/bc-ur';

export function makeCryptoPsbtFrames(psbtBytes, { fragmentLength = 120, frameCount = 32 } = {}) {
  if (!Buffer.isBuffer(psbtBytes) || psbtBytes.length < 10 || psbtBytes.length > 100000 ||
      psbtBytes.subarray(0, 5).toString('hex') !== '70736274ff')
    throw new Error('Expected raw unsigned PSBT v0 bytes');
  if (!Number.isInteger(fragmentLength) || fragmentLength < 40 || fragmentLength > 200)
    throw new Error('Invalid fragment length');
  if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > 512)
    throw new Error('Invalid frame count');
  // Blockchain Commons crypto-psbt payload must be CBOR byte string,
  // NOT the raw PSBT bytes. This package's UR constructor takes CBOR bytes.
  const n = psbtBytes.length;
  const head = n < 24 ? Buffer.from([0x40 + n])
    : n < 256 ? Buffer.from([0x58, n])
    : n < 65536 ? Buffer.from([0x59, n >> 8, n & 255])
    : Buffer.from([0x5a, (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
  const ur = new UR(Buffer.concat([head, psbtBytes]), 'crypto-psbt');
  const encoder = new UREncoder(ur, fragmentLength, 0);
  const frames = Array.from({ length: frameCount }, () => encoder.nextPart());
  if (!frames.every(frame => /^ur:crypto-psbt\//i.test(frame)))
    throw new Error('Encoder produced incorrect UR type');
  return Object.freeze(frames);
}
