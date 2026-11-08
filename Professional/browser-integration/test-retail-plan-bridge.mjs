import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotRetailGiftPlan } from '../retail-plan-bridge.mjs';

function wizard(count = 5, overrides = {}) {
  const rows = Array.from({ length: count }, (_, i) => ({
    date: new Date(Date.UTC(2027 + i, 0, 1)).toISOString().slice(0, 10),
    btc: 0.00001
  }));
  return {
    navigationState: { currentStep: 'finish_schedule' },
    scheduleRows: rows,
    schedulePlanner: { isValidReleaseDate: () => true },
    hasDustGiftOutputs: () => false,
    btcAmount: count * 0.00001,
    ...overrides
  };
}

test('five yearly releases bridge into an unfunded public-only plan', () => {
  const result = snapshotRetailGiftPlan(wizard());
  assert.equal(result.releases.length, 5);
  assert.equal(result.totalSats, 5000);
  assert.equal(result.signingAuthorized, false);
  assert.equal(result.fundingAuthorized, false);
  assert.equal(result.broadcastAuthorized, false);
});

test('24 releases is the Jade creator maximum', () => {
  assert.equal(snapshotRetailGiftPlan(wizard(24)).releases.length, 24);
  assert.throws(() => snapshotRetailGiftPlan(wizard(25)), /Invalid Retail release count/);
});

test('rejects fractional satoshis in the approved total', () => {
  assert.throws(() => snapshotRetailGiftPlan(wizard(5, { btcAmount: 0.000050001 })), /exact safe satoshi/);
});

test('rejects unsafe total satoshi values before any funding step', () => {
  assert.throws(() => snapshotRetailGiftPlan(wizard(5, { btcAmount: 90071993 })), /exact safe satoshi/);
});

test('rejects mismatched release sums', () => {
  assert.throws(() => snapshotRetailGiftPlan(wizard(5, { btcAmount: 0.00006 })), /do not match/);
});

test('rejects unapproved wizard stage', () => {
  assert.throws(() => snapshotRetailGiftPlan(wizard(5, { navigationState: { currentStep: 'start' } })), /Complete Retail gift planning/);
});
