import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotFundedDistributionIntent } from './funded-distribution-intent.mjs';

const script = 'a914' + '11'.repeat(20) + '87';
const date = '2030-01-01';
const locktime = Math.floor(Date.parse(date + 'T00:00:00.000Z') / 1000);
const plan = Object.freeze({
  format: 'bc1q21-professional-retail-plan-preview-v1',
  status: 'UNFUNDED_PREVIEW_NOT_SIGNABLE',
  releases: [{date, amountSats: 12000}], totalSats: 12000
});
const fixture = () => ({
  network: 'regtest', plan,
  utxos: [{txid: 'ab'.repeat(32), vout: 0, valueSats: 15000,
    scriptPubKeyHex: '0014' + '22'.repeat(20)}],
  giftOutputs: [{date, locktime, valueSats: 12000, scriptPubKeyHex: script}],
  changeOutput: {valueSats: 2000, scriptPubKeyHex: '0014' + '33'.repeat(20)},
  networkFeeSats: 1000
});
test('funded intent freezes public funding and planned CLTV outputs without signing', () => {
  const result = snapshotFundedDistributionIntent(fixture());
  assert.equal(result.signed, false);
  assert.equal(result.broadcastAuthorized, false);
  assert.equal(result.signatureVerified, false);
  assert.equal(result.gifts[0].locktime, locktime);
  assert.ok(Object.isFrozen(result.inputs[0]));
  assert.ok(Object.isFrozen(result.gifts[0]));
});
test('rejects mainnet, duplicate outpoints, altered date, altered amount, altered fee', () => {
  for (const mutation of [
    x => { x.network = 'mainnet'; },
    x => { x.utxos.push({...x.utxos[0]}); },
    x => { x.giftOutputs[0].date = '2031-01-01'; },
    x => { x.giftOutputs[0].valueSats = 11999; },
    x => { x.networkFeeSats = 999; },
    x => { x.giftOutputs[0].locktime++; },
  ]) {
    const x = fixture(); mutation(x);
    assert.throws(() => snapshotFundedDistributionIntent(x));
  }
});
test('rejects absent funding, missing outputs, fractional amounts and changed plan', () => {
  for (const mutation of [
    x => { x.utxos = []; },
    x => { x.giftOutputs = []; },
    x => { x.utxos[0].valueSats = 15000.5; },
    x => { x.plan = {...plan, totalSats: 13000}; },
  ]) {
    const x = fixture(); mutation(x);
    assert.throws(() => snapshotFundedDistributionIntent(x));
  }
});
