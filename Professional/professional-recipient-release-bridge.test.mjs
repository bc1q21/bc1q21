
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareRecipientReleaseEvidence } from
  './professional-recipient-release-bridge.mjs';

test('rejects invalid release numbers', () => {
  for (const releaseNumber of [0, -1, 25, 1.5, '1', null]) {
    assert.throws(
      () => prepareRecipientReleaseEvidence({
        publicHandoff: {},
        funding: {},
        releaseNumber
      }),
      /Invalid release number/
    );
  }
});

test('rejects missing public handoff', () => {
  assert.throws(
    () => prepareRecipientReleaseEvidence({
      publicHandoff: null,
      funding: {},
      releaseNumber: 1
    })
  );
});

test('rejects missing funding information', () => {
  assert.throws(
    () => prepareRecipientReleaseEvidence({
      publicHandoff: {},
      funding: null,
      releaseNumber: 1
    })
  );
});
