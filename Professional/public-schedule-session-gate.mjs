// Single-use in-memory challenge gate for isolated Professional test sessions.
// This is NOT persistent replay protection, device authentication, or authorization.
// No wallet secrets, network calls, signing, or transaction broadcast.
import { createPublicScheduleChallenge, verifyPublicScheduleReturn } from './public-schedule-return.mjs';

export class PublicScheduleSessionGate {
 #pending = new Map();
 #consumed = new Set();
 #limit;
 constructor({maxPending=32}={}) {
  if(!Number.isSafeInteger(maxPending)||maxPending<1||maxPending>1024)throw Error('Invalid pending limit');
  this.#limit=maxPending;
 }
 begin({giftTxid,outputScriptsHex,nonceHex}) {
  const challenge=createPublicScheduleChallenge({giftTxid,outputScriptsHex,nonceHex});
  const id=challenge.nonceHex;
  if(this.#pending.has(id)||this.#consumed.has(id))throw Error('Challenge nonce already used in this session');
  if(this.#pending.size>=this.#limit)throw Error('Too many pending challenges');
  this.#pending.set(id,challenge);
  return challenge;
 }
 complete({challenge,response,giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex}) {
  if(!challenge||typeof challenge.nonceHex!=='string')throw Error('Invalid challenge');
  const id=challenge.nonceHex;
  if(this.#consumed.has(id))throw Error('Challenge already consumed');
  const pending=this.#pending.get(id);
  if(!pending || JSON.stringify(pending)!==JSON.stringify(challenge))
   throw Error('Challenge is not pending in this session');
  // Consume on first attempt, including failed verification. A rejected return
  // must not be reusable with modified contents against the same challenge.
  this.#pending.delete(id);
  this.#consumed.add(id);
  const result=verifyPublicScheduleReturn({challenge,response,giftTxid,outputScriptsHex,
   accountXpub,masterFingerprintHex});
  return Object.freeze({...result,sessionChallengeConsumed:true,
   durableReplayProtection:false,deviceAuthenticated:false,beneficiaryAuthorized:false});
 }
 cancel(nonceHex) {
  if(typeof nonceHex!=='string'||!this.#pending.has(nonceHex))return false;
  this.#pending.delete(nonceHex);this.#consumed.add(nonceHex);return true;
 }
}
