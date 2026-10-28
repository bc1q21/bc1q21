import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfessionalGiftEditGate} from './gift-edit-gate.mjs';

test('planning remains editable until successful gift-specific signing', () => {
  const gate=createProfessionalGiftEditGate();
  assert.equal(gate.canEdit,true);
  gate.startSigning();
  assert.equal(gate.canEdit,false);
  assert.equal(gate.canFund,false);
  assert.throws(()=>gate.completeVerifiedSigning({giftSpecificVerified:true,transactionIntentBound:true,diagnosticOnly:true}));
  assert.equal(gate.state,'signing');
  gate.cancelSigning();
  assert.equal(gate.canEdit,true);
});
test('verified signing permanently prevents editing',()=>{
  const gate=createProfessionalGiftEditGate();
  gate.startSigning();
  gate.completeVerifiedSigning({giftSpecificVerified:true,transactionIntentBound:true,diagnosticOnly:false});
  assert.equal(gate.canEdit,false);
  assert.equal(gate.canFund,true);
  assert.throws(()=>gate.cancelSigning());
  assert.throws(()=>gate.startSigning());
});
test('abandonment never reopens signed gift',()=>{
  const gate=createProfessionalGiftEditGate();
  gate.startSigning();
  gate.completeVerifiedSigning({giftSpecificVerified:true,transactionIntentBound:true,diagnosticOnly:false});
  gate.abandon();
  assert.equal(gate.canEdit,false);
  assert.equal(gate.canFund,false);
});
