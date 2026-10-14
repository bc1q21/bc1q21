// Public-only integration of durable replay gate and pinned offline identity.
// This is not proof of recovery-word possession, decryption, or human approval.
// Store must be a real transactional durable claimOnce implementation.
import { DurablePublicScheduleGate } from './durable-public-schedule-gate.mjs';
import { verifyPinnedOfflineScheduleResponse } from './pinned-offline-schedule-response.mjs';

export class PinnedDurableScheduleReturnGate {
 #gate;
 constructor({store}) {this.#gate=new DurablePublicScheduleGate({store});}
 create(args) {return this.#gate.create(args);}
 async complete({challenge,envelope,giftTxid,outputScriptsHex,accountXpub,
  masterFingerprintHex,pinnedPublicKeyPem}) {
  // Burn the challenge before checking signature, including malicious returns.
  // A failed signature must never allow another attempt using the same nonce.
  const response=envelope?.response;
  await this.#gate.complete({challenge,response,giftTxid,outputScriptsHex,
   accountXpub,masterFingerprintHex});
  const verified=verifyPinnedOfflineScheduleResponse({envelope,pinnedPublicKeyPem,
   challenge,giftTxid,outputScriptsHex,accountXpub,masterFingerprintHex});
  return Object.freeze({...verified,nonceClaimedDurablyByStore:true,
   pinnedIdentitySignatureValid:true,identityTrustEstablishedByCaller:false,
   seedPossessionProven:false,decryptionProven:false,physicalApprovalProven:false});
 }
}
