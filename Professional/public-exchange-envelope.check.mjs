import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublicExchangeEnvelope } from './public-exchange-envelope.mjs';

const valid = () => ({
  operation:'gift-distribution',
  network:'regtest',
  giftReference:'a'.repeat(64),
  publicPayload:{amountSats:12000}
});

test('accepts a minimal hardware-neutral exchange envelope', () => {
  const result = validatePublicExchangeEnvelope(valid());
  assert.equal(result.operation, 'gift-distribution');
  assert.equal(result.giftReference, 'a'.repeat(64));
  assert.equal(result.publicPayload.amountSats, 12000);
  assert.equal(Object.isFrozen(result), true);
});

test('rejects unexpected top-level fields, malformed identifiers, and unsupported networks', () => {
  for (const change of [
    {network:'mainnet'},
    {giftReference:'invalid'},
    {operation:'generate-seed'},
    {recoveryWords:'not permitted'}
  ]) {
    assert.throws(() => validatePublicExchangeEnvelope({...valid(),...change}));
  }
});

test('rejects absent or malformed payload', () => {
  for (const payload of [null, undefined, 'string', []]) {
    assert.throws(() => validatePublicExchangeEnvelope({...valid(),publicPayload:payload}));
  }
});
