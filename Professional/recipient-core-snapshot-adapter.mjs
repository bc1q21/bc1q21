// Bind a coherent read-only Core snapshot to existing gift-specific verification.
// The injected RPC callback's transport is NOT authenticated by this module.
// This is a public evidence inspection step, never spend authorization.
import assert from 'node:assert/strict';
import {collectProfessionalCoreSnapshot} from './core-readonly-snapshot.mjs';
import {inspectProfessionalRecipientIntegration} from './recipient-integration-boundary.mjs';

export async function inspectProfessionalRecipientWithCoreSnapshot({
  rpc,giftUrl,published,commitment,publicHandoff,funding,checkpoint
}) {
 assert.ok(funding&&typeof funding==='object','Funding evidence required');
 const snapshot=await collectProfessionalCoreSnapshot({
  rpc,txid:funding.expectedTxid,vout:funding.vout
 });
 const inspected=inspectProfessionalRecipientIntegration({
  giftUrl,published,commitment,publicHandoff,funding,checkpoint,
  coreEvidence:snapshot.coreEvidence,chainTip:snapshot.chainTip
 });
 assert.equal(inspected.chainEvidenceInspected,true,'Gift-specific evidence was not inspected');
 return Object.freeze({
  ...inspected,
  tipStableDuringRead:snapshot.tipStableDuringRead,
  rpcTransportAuthenticated:false,
  chainProvenanceAuthenticated:false,
  beneficiaryAuthorized:false,ready:false,
  unsignedPsbt:null,signedPsbt:null,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
