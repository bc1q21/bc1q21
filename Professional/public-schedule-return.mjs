// Prototype public-only offline schedule return verifier.
// This is CONTEXT BINDING, not proof of device identity or beneficiary authorization.
// No seed, private key, wallet-wide decrypt passphrase, signing, or broadcast.
import { createHash, timingSafeEqual } from 'node:crypto';
import { verifyPublicRetailSchedule } from './public-retail-schedule-verify.mjs';

const exact = (obj, names) => obj && typeof obj === 'object' && !Array.isArray(obj) &&
 Object.keys(obj).length === names.length && Object.keys(obj).every(k=>names.includes(k));
const digest = (obj) => createHash('sha256').update(JSON.stringify(obj),'utf8').digest('hex');
const eq = (a,b) => typeof a==='string' && typeof b==='string' &&
 /^[a-f0-9]{64}$/.test(a) && /^[a-f0-9]{64}$/.test(b) &&
 timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
function context({giftTxid,outputScriptsHex}) {
 if (typeof giftTxid !== 'string' || !/^[a-f0-9]{64}$/.test(giftTxid))
   throw Error('Invalid public gift transaction ID');
 if (!Array.isArray(outputScriptsHex) || outputScriptsHex.length<1 || outputScriptsHex.length>120 ||
     outputScriptsHex.some(x=>typeof x!=='string'|| !/^[a-f0-9]+$/.test(x)))
   throw Error('Invalid public gift outputs');
 return digest({giftTxid,outputScriptsHex});
}
export function createPublicScheduleChallenge({giftTxid,outputScriptsHex,nonceHex}) {
 if (typeof nonceHex!=='string' || !/^[a-f0-9]{32}$/.test(nonceHex))
   throw Error('Challenge must contain fresh 128-bit nonce supplied by caller');
 return Object.freeze({version:1,kind:'bc1q21-professional-schedule-challenge',
   giftTxid,nonceHex,outputCommitment:context({giftTxid,outputScriptsHex})});
}
export function verifyPublicScheduleReturn({challenge,response,giftTxid,outputScriptsHex,
  accountXpub,masterFingerprintHex}) {
 if (!exact(challenge,['version','kind','giftTxid','nonceHex','outputCommitment']) ||
     challenge.version!==1 || challenge.kind!=='bc1q21-professional-schedule-challenge')
   throw Error('Invalid challenge');
 if (!exact(response,['version','kind','giftTxid','nonceHex','outputCommitment','firstDate','interval']) ||
     response.version!==1 || response.kind!=='bc1q21-professional-schedule-response')
   throw Error('Unexpected schedule response field or format');
 const commitment=context({giftTxid,outputScriptsHex});
 if (challenge.giftTxid!==giftTxid || response.giftTxid!==giftTxid ||
     !eq(challenge.outputCommitment,commitment) || !eq(response.outputCommitment,commitment) ||
     response.nonceHex!==challenge.nonceHex)
   throw Error('Schedule response is not bound to the requested gift and challenge');
 const schedule=verifyPublicRetailSchedule({accountXpub,masterFingerprintHex,
   firstDate:response.firstDate,interval:response.interval,outputScriptsHex});
 return Object.freeze({schedule,contextBound:true,deviceAuthenticated:false,
   beneficiaryAuthorized:false,nonceReplayProtectionProvided:false});
}
