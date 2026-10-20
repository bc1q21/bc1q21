// Professional isolated regtest signed-return acceptance boundary.
// Operates ONLY on independently reviewed unsigned PSBT and external signed-return
// bytes. No signing material generated, wallet access, network, broadcast or keys.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import {verifyProfessionalReturnedSignature} from './verify-returned-signature.mjs';
import {finalizeAndAuditProfessionalRelease} from './finalize-and-audit-release.mjs';
export function verifySameGiftExternalSignedReturn({unsignedPsbtBase64,signedPsbtBase64,expected,approval}) {
 assert.ok(expected&&expected.network==='regtest','Regtest transaction intent required');
 const fields=['fundingTxid','fundingVout','inputSats','destinationScriptHex','payoutSats','locktime','signerPubkeyHex','redeemScriptHex'];
 assert.ok(fields.every(k=>Object.hasOwn(expected,k)),'Expected transaction fields missing');
 // The approval record is NOT established by a public link, test fixture,
 // synthetic fingerprint, or a matching signature. Only independent recipient
 // authorization can release this boundary.
 assert.ok(approval&&approval.recipientAuthenticated===true&&
  approval.transactionIntentApproved===true&&approval.walletOriginAttested===true&&
  approval.fundingEvidenceCurrent===true,'Independent recipient/intent/funding approvals required');
 assert.equal(typeof unsignedPsbtBase64,'string');
 assert.equal(typeof signedPsbtBase64,'string');
 const sha=createHash('sha256').update(Buffer.from(unsignedPsbtBase64,'base64')).digest('hex');
 const original=bitcoin.Psbt.fromBase64(unsignedPsbtBase64,{network:bitcoin.networks.regtest});
 assert.equal(original.txInputs.length,1);assert.equal(original.txOutputs.length,1);
 assert.equal(Buffer.from(original.txInputs[0].hash).reverse().toString('hex'),expected.fundingTxid);
 assert.equal(original.txInputs[0].index,expected.fundingVout);
 assert.equal(original.txOutputs[0].value,expected.payoutSats);
 assert.equal(original.txOutputs[0].script.toString('hex'),expected.destinationScriptHex);
 const verified=verifyProfessionalReturnedSignature(unsignedPsbtBase64,signedPsbtBase64,sha);
 assert.equal(verified.signatureCryptographicallyVerified,true);
 const reviewed={};
 for(const key of fields)reviewed[key]=expected[key];
 const finalized=finalizeAndAuditProfessionalRelease(unsignedPsbtBase64,signedPsbtBase64,sha,reviewed);
 assert.equal(finalized.independentFinalAuditPassed,true);
 return Object.freeze({format:'bc1q21-professional-same-gift-external-return-review-v1',network:'regtest',
  fundingTxid:expected.fundingTxid,finalTxid:finalized.txid,signatureCryptographicallyVerified:true,
  finalTransactionAudited:true,rawTransactionHex:finalized.rawTransactionHex,
  readyForLiveRouting:false,canBroadcast:false,broadcast:false});
}
