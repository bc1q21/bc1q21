// Professional regtest only: combine loopback credentialed RPC with gift-specific
// public chain inspection. Transport evidence is NOT recipient authorization.
import assert from 'node:assert/strict';
import {createRegtestReadOnlyRpc} from './local-regtest-readonly-transport.mjs';
import {collectProfessionalCoreSnapshot} from './core-readonly-snapshot.mjs';
import {inspectProfessionalRecipientIntegration} from './recipient-integration-boundary.mjs';

export async function inspectRecipientUsingLocalRegtestCore({
  port,authorization,giftUrl,published,commitment,publicHandoff,funding,checkpoint
}) {
 assert.ok(funding&&typeof funding==='object','Gift funding required');
 const rpc=createRegtestReadOnlyRpc({port,authorization});
 const snapshot=await collectProfessionalCoreSnapshot({
  rpc,txid:funding.expectedTxid,vout:funding.vout
 });
 // Successful loopback HTTP Basic exchange is not proof of beneficiary intent.
 // Gift-specific continuity and exact script/value matching are checked below.
 const inspected=inspectProfessionalRecipientIntegration({
  giftUrl,published,commitment,publicHandoff,funding,checkpoint,
  coreEvidence:snapshot.coreEvidence,chainTip:snapshot.chainTip
 });
 assert.equal(inspected.chainEvidenceInspected,true,'Gift evidence was not inspected');
 return Object.freeze({
  ...inspected,
  rpcTransportAuthenticated:true,
  rpcTransportScope:'loopback-credentialed-regtest',
  tipStableDuringRead:snapshot.tipStableDuringRead,
  // Do not promote the existing untrusted caller-supplied provenance gate.
  chainProvenanceAuthenticated:false,
  beneficiaryAuthorized:false,ready:false,
  unsignedPsbt:null,signedPsbt:null,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
