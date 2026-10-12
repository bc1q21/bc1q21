import test from 'node:test';
import assert from 'node:assert/strict';
import { URDecoder } from '@ngraveio/bc-ur';
import { makeCryptoPsbtFrames } from './crypto-psbt-frames.mjs';

test('crypto-psbt animated fountain frames round-trip into exact raw PSBT bytes', () => {
  // Synthetic payload: PSBT magic + deliberately arbitrary bytes.
  // This tests UR transport only, NOT Bitcoin PSBT validity or Jade hardware.
  const raw = Buffer.concat([Buffer.from('70736274ff', 'hex'), Buffer.alloc(500, 0x35)]);
  const frames = makeCryptoPsbtFrames(raw, { fragmentLength: 120, frameCount: 80 });
  assert.equal(frames.length, 80);
  assert.ok(frames.every(x => x.startsWith('ur:crypto-psbt/')));
  const decoder = new URDecoder();
  for (const frame of frames) {
    decoder.receivePart(frame);
    if (decoder.isComplete()) break;
  }
  assert.ok(decoder.isComplete(), 'Not enough fountain frames to recover payload');
  assert.ok(decoder.isSuccess(), 'UR decoder reported failure');
  assert.equal(decoder.resultUR().type, 'crypto-psbt');
  assert.ok(Buffer.from(decoder.resultUR().decodeCBOR()).equals(raw));
});
test('rejects malformed UR frame requests', () => {
  assert.throws(() => makeCryptoPsbtFrames(Buffer.from('hello')));
  assert.throws(() => makeCryptoPsbtFrames(Buffer.concat([Buffer.from('70736274ff', 'hex'), Buffer.alloc(10)]), { fragmentLength: 0 }));
});
