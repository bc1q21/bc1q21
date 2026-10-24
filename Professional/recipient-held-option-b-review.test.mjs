import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRecipientHeldOptionBReview} from './recipient-held-option-b-review.mjs';
import {digestProfessionalGiftBinding} from './public-gift-binding-commitment.mjs';
const binding={network:'regtest',fundingTxid:'a'.repeat(64),
 releaseOutputs:[{index:0,vout:0,sats:1000,scriptPubKeyHex:'a914'+'00'.repeat(20)+'87'}]};
const valid=digestProfessionalGiftBinding(binding);
const attestation={independentChannel:true,recipientEnteredFingerprint:true};
test('recipient must supply their own fingerprint',async()=>{
 await assert.rejects(prepareRecipientHeldOptionBReview({binding,recipientAttestation:attestation}),/Recipient must enter/);
});
test('recipient must acknowledge separate delivery',async()=>{
 await assert.rejects(prepareRecipientHeldOptionBReview({binding,recipientFingerprint:valid,
 recipientAttestation:{independentChannel:false,recipientEnteredFingerprint:true}}),/outside gift website/);
});
test('recipient must personally enter the fingerprint',async()=>{
 await assert.rejects(prepareRecipientHeldOptionBReview({binding,recipientFingerprint:valid,
 recipientAttestation:{independentChannel:true,recipientEnteredFingerprint:false}}),/personally enter/);
});
test('recipient rejects a changed fingerprint',async()=>{
 await assert.rejects(prepareRecipientHeldOptionBReview({binding,recipientFingerprint:'0'.repeat(64),
 recipientAttestation:attestation}),/differs from independently held commitment/);
});
test('recipient rejects extra attestation fields',async()=>{
 await assert.rejects(prepareRecipientHeldOptionBReview({binding,recipientFingerprint:valid,
 recipientAttestation:{...attestation,siteApproved:true}}),/Unexpected recipient attestation fields/);
});
