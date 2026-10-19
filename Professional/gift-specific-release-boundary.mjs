// Public preview -> strict fail-closed release boundary.
// A public candidate cannot prove ownership or private schedule recovery.
import {inspectGiftSpecificPreview} from './gift-specific-public-preview.mjs';

export function inspectRecipientReleaseBoundary(url, transactions) {
  const preview=inspectGiftSpecificPreview(url,transactions);
  return Object.freeze({
    preview,
    state:'authorization-required',
    unsignedPsbt:null,
    signedPsbt:null,
    permitted:false,
    requiredEvidence:Object.freeze([
      'cryptographically bound gift identity',
      'independently verified funded and unspent outpoint',
      'authenticated offline private schedule recovery',
      'CLTV maturity from verified chain state',
      'recipient-approved destination and fee',
      'offline signer transaction review'
    ])
  });
}
