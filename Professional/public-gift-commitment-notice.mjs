// Professional-only public commitment handoff. A creator may transmit this
// fingerprint by an independently chosen channel alongside the gift notice.
// No seed words, xprvs, secrets, authorization or QR signing data are included.
// The recipient must independently compare the expected fingerprint.
import assert from 'node:assert/strict';
import {digestProfessionalGiftBinding,verifyProfessionalGiftBindingCommitment} from './public-gift-binding-commitment.mjs';

const format=x=>x.match(/.{1,8}/g).join(' ');
export function createPublicGiftCommitmentNotice(binding) {
 const digest=digestProfessionalGiftBinding(binding);
 return Object.freeze({
  version:1,network:'regtest',fundingTxid:binding.fundingTxid,
  releaseCount:binding.releaseOutputs.length,
  fingerprint:digest,displayFingerprint:format(digest),
  instructions:'Creator: share this public fingerprint by a channel independently chosen with the recipient. Recipient: compare all 64 hexadecimal characters with the fingerprint displayed during gift release. This is not a recovery phrase or spend authorization.',
  containsPrivateKeys:false,containsRecoveryWords:false,
  creatorAuthenticated:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
export function compareRecipientGiftCommitment(binding,receivedFingerprint) {
 assert.equal(typeof receivedFingerprint,'string','Recipient-supplied fingerprint required');
 // Spaces are permitted for reading and manual comparison, but not changes
 // in case, symbols, missing digits, or abbreviated prefixes.
 const compact=receivedFingerprint.replace(/ /g,'');
 const checked=verifyProfessionalGiftBindingCommitment(binding,compact);
 return Object.freeze({
  ...checked,recipientComparedCommitment:true,
  // Comparison alone cannot establish who sent the fingerprint.
  creatorAuthenticated:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
