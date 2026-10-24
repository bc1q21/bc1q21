// Professional-only recipient commitment checkpoint. This is an explicit
// recipient-controlled handoff, NOT cryptographic proof of creator identity.
// No site-supplied fingerprint may be substituted for recipient-held evidence.
import assert from 'node:assert/strict';
import {compareRecipientGiftCommitment} from './public-gift-commitment-notice.mjs';
import {prepareOptionBFundedLinkReview} from './option-b-funded-link-review.mjs';

export async function prepareRecipientHeldOptionBReview({
 recipientFingerprint,recipientAttestation,...options
}) {
 assert.equal(typeof recipientFingerprint,'string',
  'Recipient must enter their independently retained fingerprint');
 assert.ok(recipientAttestation&&typeof recipientAttestation==='object'&&
  !Array.isArray(recipientAttestation),'Recipient handoff acknowledgement required');
 assert.deepEqual(Object.keys(recipientAttestation).sort(),
  ['independentChannel','recipientEnteredFingerprint'].sort(),
  'Unexpected recipient attestation fields');
 assert.equal(recipientAttestation.recipientEnteredFingerprint,true,
  'Recipient must personally enter their held fingerprint');
 assert.equal(recipientAttestation.independentChannel,true,
  'Recipient must acknowledge receiving fingerprint outside gift website');
 const checked=compareRecipientGiftCommitment(options.binding,recipientFingerprint);
 const result=await prepareOptionBFundedLinkReview({
  ...options,expectedBindingDigest:checked.bindingDigest
 });
 return Object.freeze({
  ...result,
  recipientFingerprintCompared:true,
  independentChannelAcknowledged:true,
  // Acknowledgement is NOT independently verified identity or provenance.
  creatorAuthenticated:false,recipientCommitmentProvenanceVerified:false,
  canSign:false,canBroadcast:false
 });
}
