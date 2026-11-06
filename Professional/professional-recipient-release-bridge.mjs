
// bc1q21 Professional — disposable regtest release bridge.
// Converts the existing public-only release builder output into
// gift-specific unsigned PSBT evidence for the recipient page.
// No private keys, signing, network requests, or broadcasting.

import { createHash } from 'node:crypto';
import { prepareProfessionalReleaseFromPublicHandoff }
  from './public-funding-release-integration.mjs';

export function prepareRecipientReleaseEvidence({
  publicHandoff,
  funding,
  releaseNumber
}) {
  if (!Number.isSafeInteger(releaseNumber) ||
      releaseNumber < 1 ||
      releaseNumber > 24) {
    throw Error('Invalid release number');
  }

  const built = prepareProfessionalReleaseFromPublicHandoff(
    publicHandoff,
    funding
  );

  if (built.network !== 'regtest' ||
      built.signed !== false ||
      built.broadcast !== false) {
    throw Error('Unsafe release builder result');
  }

  const approvedUnsignedBase64 = built.unsignedPsbtBase64;

  if (typeof approvedUnsignedBase64 !== 'string' ||
      approvedUnsignedBase64.length === 0) {
    throw Error('Missing unsigned PSBT');
  }

  const expectedApprovedSha256 = createHash('sha256')
    .update(Buffer.from(approvedUnsignedBase64, 'base64'))
    .digest('hex');

  return Object.freeze({
    releaseNumber,
    approvedUnsignedBase64,
    expectedApprovedSha256
  });
}
