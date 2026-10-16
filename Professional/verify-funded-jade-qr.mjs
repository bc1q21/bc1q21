// Isolated regtest test only. No network, keys, or broadcast.
import { readFileSync } from 'node:fs';
const frames = readFileSync(new URL('./bc1q21_Jade_Signed_PSBT_QR_frames (1).txt', import.meta.url), 'utf8').split(/\r?\n/).filter(x => /^ur:crypto-psbt\//i.test(x));
if (frames.length !== 9) throw new Error('Expected nine captured QR frames');
console.log('PASS_CAPTURE_FRAME_COUNT', frames.length);
