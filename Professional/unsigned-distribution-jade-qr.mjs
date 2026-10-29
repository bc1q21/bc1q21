// bc1q21 Professional — encode the validated unsigned distribution PSBT for Jade QR.
// Public-only disposable regtest; this adapter never signs or broadcasts.
import {createHash} from 'node:crypto';
import {makeCryptoPsbtFrames} from './crypto-psbt-frames.mjs';
const fail = m => {throw Error('Professional Jade QR handoff: '+m)};
export function makeUnsignedDistributionJadeQr(unsigned, options = {}) {
  if (unsigned?.format !== 'bc1q21-professional-funded-distribution-unsigned-psbt-v1' ||
      unsigned.network !== 'regtest' || unsigned.signed !== false ||
      unsigned.broadcast !== false || unsigned.hardwareSignatureVerified !== false ||
      unsigned.nextEncoder !== 'ur:crypto-psbt') fail('Unsigned regtest distribution required');
  const b64=unsigned.unsignedPsbtBase64;
  if (typeof b64 !== 'string' || b64.length > 140000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4)
    fail('Invalid PSBT encoding');
  const raw=Buffer.from(b64,'base64');
  if (raw.toString('base64') !== b64 ||
      raw.subarray(0,5).toString('hex') !== '70736274ff')
    fail('Noncanonical or invalid PSBT');
  const sha=createHash('sha256').update(raw).digest('hex');
  if (sha !== unsigned.psbtSha256) fail('Unsigned PSBT changed after construction');
  const frames=makeCryptoPsbtFrames(raw,options);
  return Object.freeze({
    format:'bc1q21-professional-unsigned-distribution-jade-qr-v1',
    network:'regtest', psbtSha256:sha, frames,
    frameCount:frames.length, signed:false, broadcast:false,
    nextStep:'SCAN_ON_JADE_AND_VERIFY_RETURNED_SIGNATURE_AGAINST_ORIGINAL_INTENT'
  });
}
