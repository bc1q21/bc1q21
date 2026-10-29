// bc1q21 Professional — accept a reconstructed Jade signed crypto-psbt payload.
// The existing browser camera receiver supplies RAW PSBT bytes after UR decoding.
// This gate independently verifies the exact funded creator transaction and ECDSA
// signatures. It never finalizes, broadcasts, or handles private keys.
import {verifySignedFundedDistributionPsbt} from './verify-signed-funded-distribution.mjs';
const fail=m=>{throw Error('Professional signed QR gate: '+m)};
export function verifyCreatorSignedQrPayload(unsigned,rawPsbtBytes) {
 if(!Buffer.isBuffer(rawPsbtBytes)||rawPsbtBytes.length<10||
    rawPsbtBytes.length>100000||
    rawPsbtBytes.subarray(0,5).toString('hex')!=='70736274ff')
    fail('Expected decoded signed crypto-psbt payload');
 const verified=verifySignedFundedDistributionPsbt(unsigned,rawPsbtBytes.toString('base64'));
 if(verified.signatureCryptographicallyVerified!==true||
    verified.transactionIntentBound!==true)
    fail('Signature and gift-specific transaction verification required');
 return Object.freeze({
  format:'bc1q21-professional-creator-qr-verified-v1',
  network:'regtest',approvedPsbtSha256:verified.approvedPsbtSha256,
  inputSignaturesVerified:verified.inputSignaturesVerified,
  giftSpecificVerified:true,transactionIntentBound:true,diagnosticOnly:false,
  signatureCryptographicallyVerified:true,verifiedSignedPsbtBase64:rawPsbtBytes.toString('base64'),
  broadcast:false,canBroadcast:false
 });
}
