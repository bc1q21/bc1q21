// Bridge a trusted-local, completed one-use beneficiary review into
// recipient QR display. Never accept a caller-supplied QR authorization flag.
import assert from 'node:assert/strict';
import {URDecoder} from '@ngraveio/bc-ur';
import cbor from 'cbor';
import {createHash} from 'node:crypto';
import {renderApprovedRecipientQrImages} from './recipient-approved-qr-images.mjs';
export async function prepareReviewedFundedRecipientQr({view,beneficiary,frameCount=8}) {
 assert.equal(view?.format,'bc1q21-professional-funded-calendar-recipient-view-v1');
 assert.equal(view.network,'regtest');
 assert.equal(view.coreFundingVerifiedAtReviewCreation,true);
 assert.equal(view.canSign,false);assert.equal(view.canBroadcast,false);
 assert.equal(typeof beneficiary?.reviewCompleted,'function');
 assert.equal(beneficiary.reviewCompleted(),true,'Completed trusted beneficiary review required');
 const expectedDigest=beneficiary.review().psbtSha256;
 assert.match(expectedDigest,/^[a-f0-9]{64}$/);
 // The trusted closure rechecks the funded UTXO and consumes this export once.
 const exported=await beneficiary.exportQrFrames({frameCount});
 assert.equal(exported.network,'regtest');
 assert.equal(exported.signed,false);assert.equal(exported.broadcast,false);
 assert.equal(exported.psbtSha256,expectedDigest,'QR digest differs from approved transaction');
 const decoder=new URDecoder();
 for(const frame of exported.frames)decoder.receivePart(frame);
 assert.ok(decoder.isComplete()&&decoder.isSuccess(),'QR frames did not reconstruct');
 const bytes=Buffer.from(cbor.decodeFirstSync(Buffer.from(decoder.resultUR().cbor)));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),expectedDigest,
  'Reconstructed QR differs from approved PSBT');
 assert.equal(bytes.subarray(0,5).toString('hex'),'70736274ff');
 return renderApprovedRecipientQrImages({network:'regtest',format:'ur:crypto-psbt',
  verifiedRoundTrip:true,frames:exported.frames,signed:false,broadcast:false});
}
