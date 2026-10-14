import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublicExchangeEnvelope } from './public-exchange-envelope.mjs';

const valid = () => ({
  operation:'gift-distribution',
  network:'regtest',
  giftReference:'a'.repeat(64),
  publicPayload:{giftOutputs:[{scriptPubKeyHex:'a914'+'ab'.repeat(20)+'87',valueSats:12000}],serviceFeeOutput:{scriptPubKeyHex:'0014'+'cd'.repeat(20),valueSats:500},changeOutput:null,minerFeeSats:100}
});

test('accepts a minimal hardware-neutral exchange envelope', () => {
  const result = validatePublicExchangeEnvelope(valid());
  assert.equal(result.operation, 'gift-distribution');
  assert.equal(result.giftReference, 'a'.repeat(64));
  assert.equal(result.publicPayload.giftOutputs[0].valueSats, 12000);
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

test('preserves retail output ordering and rejects nested secrets', () => {
  const result = validatePublicExchangeEnvelope(valid());
  assert.equal(result.publicPayload.giftOutputs.length, 1);
  assert.equal(result.publicPayload.serviceFeeOutput.valueSats, 500);
  assert.equal(Object.isFrozen(result.publicPayload.giftOutputs[0]), true);
  for (const key of ['mnemonic','seedPhrase','privateKey','wif','opReturnEncryptionSecret']) {
    assert.throws(() => validatePublicExchangeEnvelope({
      ...valid(),publicPayload:{...valid().publicPayload,details:{[key]:'forbidden'}}
    }));
  }
});

test('rejects malformed gift distribution payloads', () => {
  for (const payload of [
    {amountSats:12000},
    {...valid().publicPayload,giftOutputs:[]},
    {...valid().publicPayload,giftOutputs:[{scriptPubKeyHex:'zz',valueSats:12000}]},
    {...valid().publicPayload,minerFeeSats:-1},
    {...valid().publicPayload,unexpected:true}
  ]) {
    assert.throws(() => validatePublicExchangeEnvelope({...valid(),publicPayload:payload}));
  }
});
