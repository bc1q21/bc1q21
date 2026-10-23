import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFreshApprovalForControlledQr} from './fresh-approval-qr-boundary.mjs';

const tip='a'.repeat(64),txid='b'.repeat(64),digest='c'.repeat(64);
const giftEvidence={observedTip:tip,releaseCount:1,verifiedOutputs:[{index:0,txid,vout:0,sats:12000,scriptPubKeyHex:'0014'+'11'.repeat(20)}]};
const freshness={network:'regtest',freshOutpointMatched:true,approvalStillTipBound:true,
 approvalConsumed:true,canExportSigningQr:false,observedTip:tip,releaseIndex:0,
 txid,vout:0,psbtSha256:digest};
const funding={expectedSats:12000};
const check=(f=freshness,g=giftEvidence,i=0)=>inspectFreshApprovalForControlledQr({
 freshness:f,giftEvidence:g,releaseIndex:i,publicHandoff:{},funding,approvedIntent:{}
});

test('forged readiness and changed tip cannot cross QR boundary',()=>{
 assert.throws(()=>check({...freshness,freshOutpointMatched:false}),/Fresh outpoint/);
 assert.throws(()=>check({...freshness,approvalConsumed:false}),/One-time approval/);
 assert.throws(()=>check({...freshness,canExportSigningQr:true}),/must not grant QR/);
 assert.throws(()=>check({...freshness,observedTip:'d'.repeat(64)}),/Gift tip changed/);
 assert.throws(()=>check({...freshness,releaseIndex:1}),/Wrong gift release/);
});

test('wrong funding output or amount is rejected before PSBT construction',()=>{
 assert.throws(()=>check({...freshness,vout:1}),/Wrong funding outpoint/);
 assert.throws(()=>check({...freshness,txid:'d'.repeat(64)}),/Wrong funding transaction/);
 assert.throws(()=>inspectFreshApprovalForControlledQr({
  freshness,giftEvidence,releaseIndex:0,publicHandoff:{},
  funding:{expectedSats:11000},approvedIntent:{}
 }),/Wrong funding amount/);
});

test('QR inspection rejects incomplete release evidence and missing funding script',()=>{
 assert.throws(()=>check(freshness,{...giftEvidence,releaseCount:2}),
  /Complete verified gift release set required/);
 assert.throws(()=>check(freshness,{...giftEvidence,verifiedOutputs:[{...giftEvidence.verifiedOutputs[0],scriptPubKeyHex:undefined}]}),
  /Verified funding script required/);
});
