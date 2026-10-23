// Regtest-only unsigned PSBT byte-integrity check for the future trusted QR
// path. This is a data check, NOT an authorization capability or QR exporter.
import assert from 'node:assert/strict';
import {createProfessionalTransactionConfirmation} from './transaction-confirmation.mjs';
import {prepareApprovedProfessionalRelease} from './approved-release-gate.mjs';
import {releaseExactlyApprovedUnsignedPsbt} from './approved-psbt-handoff.mjs';

export function inspectExactUnsignedPsbtForRestrictedQr({
 checkedReview,publicHandoff,funding,approvedIntent
}) {
 assert.equal(checkedReview?.network,'regtest','Regtest checked review required');
 assert.equal(checkedReview?.reviewFinalized,true,'Finalized review required for integrity check');
 assert.equal(checkedReview?.exactApprovedPsbtMatched,true,'Exact checked PSBT required');
 assert.equal(checkedReview?.canExportSigningQr,false,'Review must not authorize QR export');
 assert.equal(checkedReview?.canSign,false,'Review must not authorize signing');
 assert.equal(checkedReview?.canBroadcast,false,'Review must not authorize broadcasting');
 assert.match(checkedReview?.psbtSha256??'',/^[a-f0-9]{64}$/,'Checked PSBT digest required');
 const record=createProfessionalTransactionConfirmation(publicHandoff,funding,approvedIntent);
 assert.equal(record.psbtSha256,checkedReview.psbtSha256,'PSBT changed after beneficiary review');
 const release=prepareApprovedProfessionalRelease(publicHandoff,funding,approvedIntent);
 // The helper validates raw bytes, canonical base64, unsigned state and shape.
 // Its approval parameter is only a data-integrity precondition; it is NOT
 // proof of beneficiary authorization and is never exposed to the caller.
 const verified=releaseExactlyApprovedUnsignedPsbt(release,{
  network:'regtest',psbtSha256:record.psbtSha256,explicitlyApproved:true,
  signed:false,broadcast:false
 });
 assert.equal(verified.psbtSha256,checkedReview.psbtSha256,'Unsigned bytes changed');
 return Object.freeze({
  network:'regtest',psbtSha256:verified.psbtSha256,
  exactUnsignedBytesMatched:true,
  // Do not return PSBT bytes or QR frames before a genuine private one-time
  // capability and fresh Core recheck are implemented.
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
