// Isolated synthetic offline schedule-response composer.
// This module does not derive, accept, or transmit recovery words or wallet keys.
// Decryption and human approval are external prerequisites, not proven here.
// Never treat its output as a production hardware authorization.
import { createPublicScheduleChallenge } from './public-schedule-return.mjs';

const fields=['version','kind','giftTxid','nonceHex','outputCommitment'];
const exact=(x,n)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===n.length&&Object.keys(x).every(k=>n.includes(k));
export function composeApprovedPublicScheduleResponse({challenge,giftTxid,outputScriptsHex,
 firstDate,interval,approved}) {
 if(approved!==true)throw Error('Explicit offline approval required');
 if(!exact(challenge,fields))throw Error('Invalid schedule challenge');
 const expected=createPublicScheduleChallenge({giftTxid,outputScriptsHex,nonceHex:challenge.nonceHex});
 if(JSON.stringify(challenge)!==JSON.stringify(expected))
  throw Error('Offline challenge does not match gift output commitment');
 if(typeof firstDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(firstDate))
  throw Error('Invalid recovered first date');
 if(interval!=='month'&&interval!=='year')throw Error('Invalid recovered interval');
 return Object.freeze({version:1,kind:'bc1q21-professional-schedule-response',
  giftTxid,nonceHex:challenge.nonceHex,outputCommitment:challenge.outputCommitment,
  firstDate,interval});
}
