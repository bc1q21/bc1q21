// Professional-only read-only preflight: bind a proposed beneficiary approval
// to one of the verified outputs of a single regtest gift. This is NOT proof
// of recipient identity, human review, or permission to export a signing QR.
import assert from 'node:assert/strict';

export function inspectBeneficiaryIntentAgainstGift({giftEvidence,releaseIndex,approvedIntent}) {
 assert.equal(giftEvidence?.network,'regtest','Regtest gift required');
 assert.equal(giftEvidence?.outputsConsistent,true,'Complete gift output verification required');
 assert.equal(giftEvidence?.tipStableDuringRead,true,'Stable Core tip required');
 assert.ok(Array.isArray(giftEvidence.verifiedOutputs)&&
  giftEvidence.verifiedOutputs.length===giftEvidence.releaseCount&&
  giftEvidence.releaseCount>0,'Complete verified gift release set required');
 assert.ok(Number.isSafeInteger(releaseIndex)&&releaseIndex>=0&&
  releaseIndex<giftEvidence.releaseCount,'Invalid release selection');
 const output=giftEvidence.verifiedOutputs[releaseIndex];
 assert.equal(output?.index,releaseIndex,'Wrong gift release index');
 assert.equal(output?.txid,giftEvidence.fundingTxid,'Wrong gift funding transaction');
 assert.ok(approvedIntent&&typeof approvedIntent==='object'&&!Array.isArray(approvedIntent),
  'Beneficiary transaction intent required');
 assert.equal(approvedIntent.expectedTxid,output.txid,'Approved gift txid mismatch');
 assert.equal(approvedIntent.vout,output.vout,'Approved gift output mismatch');
 assert.equal(approvedIntent.expectedSats,output.sats,'Approved gift amount mismatch');
 assert.ok(Number.isSafeInteger(approvedIntent.destinationSats)&&
  approvedIntent.destinationSats>0&&approvedIntent.destinationSats<output.sats,
  'Invalid payout amount');
 assert.ok(typeof approvedIntent.destinationScriptHex==='string'&&
  /^(?:[0-9a-f]{2})+$/i.test(approvedIntent.destinationScriptHex),
  'Destination script required');
 assert.ok(Number.isSafeInteger(approvedIntent.locktime)&&
  approvedIntent.locktime>=0&&approvedIntent.locktime<=0xffffffff,
  'Exact approved locktime required');
 assert.ok(typeof approvedIntent.signerPubkeyHex==='string'&&
  /^(02|03)[0-9a-f]{64}$/i.test(approvedIntent.signerPubkeyHex),
  'Exact approved signer required');
 return Object.freeze({
  network:'regtest',releaseIndex,txid:output.txid,vout:output.vout,
  inputSats:output.sats,payoutSats:approvedIntent.destinationSats,
  feeSats:output.sats-approvedIntent.destinationSats,
  proposedIntentMatchesGift:true,
  // Matching public values does not establish a trusted beneficiary or a
  // mature CLTV condition. The actual one-time QR approval stays separate.
  beneficiaryAuthorized:false,cltvMaturityAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
