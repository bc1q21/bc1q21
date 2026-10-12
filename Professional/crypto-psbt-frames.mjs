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
  // Blockchain Commons crypto-psbt is CBOR byte string of the raw PSBT.
  // UR.fromBuffer wraps bytes as a CBOR byte string and takes the UR type.
  const ur = UR.fromBuffer(psbtBytes, 'crypto-psbt');
  const encoder = new UREncoder(ur, fragmentLength, 0);
  const frames = Array.from({ length: frameCount }, () => encoder.nextPart());
  if (!frames.every(frame => /^ur:crypto-psbt\//i.test(frame)))
    throw new Error('Encoder produced incorrect UR type');
  return Object.freeze(frames);
}
