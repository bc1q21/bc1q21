// bc1q21 Professional: bind gift link, funding transaction and independently
// caller-fetched regtest chain continuity. Does not authenticate RPC transport.
import assert from 'node:assert/strict';
import {verifyGiftSpecificFundingBinding} from './gift-specific-funding-binding.mjs';
import {verifyCoreFundingObservation} from './regtest-core-observation.mjs';
import {verifyProfessionalPublicHandoff} from './public-handoff.mjs';

export function inspectGiftSpecificCoreContinuity(url,handoff,funding,checkpoint,coreEvidence) {
 verifyGiftSpecificFundingBinding(url,handoff,funding);
 const wallet=verifyProfessionalPublicHandoff(handoff);
 assert.equal(checkpoint.fundingTxid,funding.expectedTxid,'Checkpoint funding txid mismatch');
 assert.equal(checkpoint.vout,funding.vout,'Checkpoint funding index mismatch');
 assert.equal(checkpoint.amountSats,funding.expectedSats,'Checkpoint funding amount mismatch');
 assert.equal(checkpoint.scriptPubKeyHex,wallet.fundingScriptPubKeyHex,
  'Checkpoint funding script mismatch');
 const verified=verifyCoreFundingObservation(checkpoint,coreEvidence);
 return Object.freeze({
  network:'regtest',fundingTxid:verified.fundingTxid,vout:verified.vout,
  observationConsistent:true,rpcProvenanceVerified:false,
  chainMaturityVerified:false,authenticated:false,scheduleUnlocked:false,
  canSign:false,canBroadcast:false
 });
}
