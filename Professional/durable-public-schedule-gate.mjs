// Persistent replay-control protocol for an isolated Professional test harness.
// The caller supplies a durable transactional store; no filesystem, network,
// secrets, hardware operations, signing, or Bitcoin broadcast occur here.
//
// The store MUST provide atomic claimOnce(key) with durable write-before-success
// semantics across processes, restarts, and concurrent callers. An in-memory Map
// is NOT a valid production store. This module deliberately does not claim
// device authentication or beneficiary authorization.
import { createPublicScheduleChallenge,verifyPublicScheduleReturn } from './public-schedule-return.mjs';

const nonceKey = nonceHex => 'bc1q21:professional:schedule:v1:' + nonceHex;
export class DurablePublicScheduleGate {
 #store;
 constructor({store}) {
  if (!store || typeof store.claimOnce !== 'function')
   throw Error('Transactional durable claimOnce store required');
  this.#store=store;
 }
 create({giftTxid,outputScriptsHex,nonceHex}) {
  return createPublicScheduleChallenge({giftTxid,outputScriptsHex,nonceHex});
 }
 async complete({challenge,response,giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex}) {
  if (!challenge || typeof challenge.nonceHex!=='string' ||
      !/^[a-f0-9]{32}$/.test(challenge.nonceHex))
   throw Error('Invalid challenge nonce');
  // Burn the nonce before verification, including for invalid responses.
  // The transactional claim must be durable before this call returns true.
  const claimed=await this.#store.claimOnce(nonceKey(challenge.nonceHex));
  if(claimed!==true)throw Error('Challenge nonce already consumed or store unavailable');
  const result=verifyPublicScheduleReturn({challenge,response,giftTxid,outputScriptsHex,
   accountXpub,masterFingerprintHex});
  return Object.freeze({...result,nonceClaimedDurablyByStore:true,
   deviceAuthenticated:false,beneficiaryAuthorized:false});
 }
}
