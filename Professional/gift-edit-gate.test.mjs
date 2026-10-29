import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfessionalGiftEditGate} from './gift-edit-gate.mjs';
const hash='a1'.repeat(32);
const evidence={network:'regtest',chainVerified:true,fundingOutpointsVerified:true,
 giftSpecificVerified:true,broadcastAuthorized:false};
const unsigned={format:'bc1q21-professional-funded-distribution-unsigned-psbt-v1',
 network:'regtest',signed:false,broadcast:false,hardwareSignatureVerified:false,psbtSha256:hash};
const verified={format:'bc1q21-professional-creator-qr-verified-v1',network:'regtest',
 giftSpecificVerified:true,transactionIntentBound:true,signatureCryptographicallyVerified:true,
 broadcast:false,canBroadcast:false,approvedPsbtSha256:hash};
test('enforces plan then verified funding then Jade signing then finish',()=>{
 const gate=createProfessionalGiftEditGate();
 assert.equal(gate.canEdit,true);
 assert.equal(gate.canFund,false);
 assert.throws(()=>gate.startSigning(unsigned));
 gate.startFunding();
 assert.equal(gate.canEdit,false);
 assert.equal(gate.canFund,true);
 assert.throws(()=>gate.confirmFunding({...evidence,chainVerified:false}));
 assert.equal(gate.state,'funding');
 gate.confirmFunding(evidence);
 assert.equal(gate.canSign,true);
 assert.equal(gate.canFund,false);
 gate.startSigning(unsigned);
 assert.equal(gate.canFinish,false);
 assert.throws(()=>gate.completeVerifiedSigning({...verified,signatureCryptographicallyVerified:false}));
 assert.throws(()=>gate.completeVerifiedSigning({...verified,approvedPsbtSha256:'ff'.repeat(32)}));
 assert.equal(gate.state,'signing');
 gate.completeVerifiedSigning(verified);
 assert.equal(gate.canFinish,true);
 assert.equal(gate.canEdit,false);
 assert.equal(gate.canBroadcast,false);
 assert.throws(()=>gate.startFunding());
});
test('cancel funding returns to editable plan, cancel signing returns to funded',()=>{
 const gate=createProfessionalGiftEditGate();
 gate.startFunding();gate.cancelFunding();assert.equal(gate.canEdit,true);
 gate.startFunding();gate.confirmFunding(evidence);
 gate.startSigning(unsigned);gate.cancelSigning();
 assert.equal(gate.canSign,true);
 assert.equal(gate.canEdit,false);
 assert.equal(gate.canFinish,false);
});
test('unverified camera scan never completes signing',()=>{
 const gate=createProfessionalGiftEditGate();
 gate.startFunding();gate.confirmFunding(evidence);gate.startSigning(unsigned);
 assert.throws(()=>gate.completeVerifiedSigning({giftSpecificVerified:true,transactionIntentBound:true,diagnosticOnly:false}));
 assert.equal(gate.canFinish,false);
});
test('abandonment is terminal and never broadcasts',()=>{
 const gate=createProfessionalGiftEditGate();
 gate.startFunding();gate.confirmFunding(evidence);gate.startSigning(unsigned);
 gate.completeVerifiedSigning(verified);gate.abandon();
 assert.equal(gate.canEdit,false);assert.equal(gate.canFund,false);
 assert.equal(gate.canFinish,false);assert.equal(gate.canBroadcast,false);
});
