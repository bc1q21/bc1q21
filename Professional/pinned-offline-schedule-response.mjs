// Verify an offline companion's signed schedule-response envelope.
// Experimental identity binding ONLY: an independently trusted/pinned public key
// is required. This does not prove seed possession, successful AES decryption,
// physical user approval, or Jade Plus support. No signing or wallet secrets here.
import { createPublicKey, verify } from 'node:crypto';
import { verifyPublicScheduleReturn } from './public-schedule-return.mjs';

const envelopeFields=['version','kind','response','signatureHex'];
function exact(o,fields){return !!o && typeof o==='object' && !Array.isArray(o) &&
 Object.keys(o).length===fields.length && Object.keys(o).every(k=>fields.includes(k));}
export function scheduleResponseSigningBytes(response) {
 const fields=['version','kind','giftTxid','nonceHex','outputCommitment','firstDate','interval'];
 if(!exact(response,fields) || response.version!==1 ||
    response.kind!=='bc1q21-professional-schedule-response')
  throw Error('Unexpected schedule response format');
 return Buffer.from('bc1q21-professional-schedule-response-signature-v1\n'+
  fields.map(k=>JSON.stringify(response[k])).join('\n'),'utf8');
}
export function verifyPinnedOfflineScheduleResponse({envelope,pinnedPublicKeyPem,
 challenge,giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex}) {
 if(!exact(envelope,envelopeFields)||envelope.version!==1||
    envelope.kind!=='bc1q21-professional-signed-schedule-response')
  throw Error('Invalid signed schedule envelope');
 if(typeof envelope.signatureHex!=='string'|| !/^[a-f0-9]{128}$/.test(envelope.signatureHex))
  throw Error('Invalid signature');
 if(typeof pinnedPublicKeyPem!=='string'||!pinnedPublicKeyPem.startsWith('-----BEGIN PUBLIC KEY-----'))
  throw Error('Missing independently pinned public key');
 const key=createPublicKey(pinnedPublicKeyPem);
 if(key.asymmetricKeyType!=='ed25519')throw Error('Expected pinned Ed25519 identity');
 if(!verify(null,scheduleResponseSigningBytes(envelope.response),key,Buffer.from(envelope.signatureHex,'hex')))
  throw Error('Offline companion signature verification failed');
 const result=verifyPublicScheduleReturn({challenge,response:envelope.response,giftTxid,
  outputScriptsHex,accountXpub,masterFingerprintHex});
 return Object.freeze({...result,pinnedIdentitySignatureValid:true,
  identityTrustEstablishedByCaller:false,seedPossessionProven:false,
  decryptionProven:false,physicalApprovalProven:false});
}
