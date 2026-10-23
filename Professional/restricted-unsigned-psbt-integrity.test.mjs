import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectExactUnsignedPsbtForRestrictedQr} from './restricted-unsigned-psbt-integrity.mjs';

const checkedReview=Object.freeze({
 network:'regtest',reviewFinalized:true,exactApprovedPsbtMatched:true,
 canExportSigningQr:false,canSign:false,canBroadcast:false,
 psbtSha256:'a'.repeat(64)
});
const inspect=(review)=>inspectExactUnsignedPsbtForRestrictedQr({
 checkedReview:review,publicHandoff:{},funding:{},approvedIntent:{}
});

test('unsigned PSBT integrity gate rejects forged QR readiness and wrong network',()=>{
 for(const altered of [
  {network:'mainnet'},
  {network:'testnet'},
  {reviewFinalized:false},
  {exactApprovedPsbtMatched:false},
  {canExportSigningQr:true},
  {canSign:true},
  {canBroadcast:true},
  {psbtSha256:'a'.repeat(63)},
  {psbtSha256:'z'.repeat(64)}
 ]) {
  assert.throws(()=>inspect({...checkedReview,...altered}));
 }
});

test('unsigned PSBT integrity gate never trusts a caller-supplied approval digest alone',()=>{
 assert.throws(()=>inspect({...checkedReview,beneficiaryAuthorized:true,approvalRecorded:true}),
  /Professional approval gate/);
});

test('unsigned PSBT integrity gate rejects absent or malformed review',()=>{
 for(const review of [undefined,null,{},'approved']) {
  assert.throws(()=>inspect(review));
 }
});
