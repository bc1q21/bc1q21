import test from 'node:test';
import assert from 'node:assert/strict';
import {issueInternalGiftApprovalReceipt,consumeInternalGiftApprovalReceipt} from './internal-gift-approval-provenance.mjs';

const fields={network:'regtest',releaseIndex:7,observedTip:'a'.repeat(64),
 psbtSha256:'b'.repeat(64),approvalRecorded:true};
test('genuine in-process receipt is consumed only once and never grants signing',()=>{
 const receipt=issueInternalGiftApprovalReceipt(fields);
 const accepted=consumeInternalGiftApprovalReceipt(receipt);
 assert.equal(accepted.releaseIndex,7);
 assert.equal(accepted.canExportSigningQr,false);
 assert.equal(accepted.canSign,false);
 assert.equal(accepted.beneficiaryAuthorized,false);
 assert.throws(()=>consumeInternalGiftApprovalReceipt(receipt),/already consumed/);
});
test('copied or forged receipt cannot cross provenance boundary',()=>{
 const receipt=issueInternalGiftApprovalReceipt(fields);
 assert.throws(()=>consumeInternalGiftApprovalReceipt({...receipt}),/not issued/);
 assert.throws(()=>consumeInternalGiftApprovalReceipt(JSON.parse(JSON.stringify(receipt))),/not issued/);
 assert.throws(()=>consumeInternalGiftApprovalReceipt({...fields}),/not issued/);
 assert.throws(()=>consumeInternalGiftApprovalReceipt(null),/not issued/);
});
