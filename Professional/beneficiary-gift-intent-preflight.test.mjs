import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBeneficiaryIntentAgainstGift} from './beneficiary-gift-intent-preflight.mjs';

const txid='a'.repeat(64);
const giftEvidence={network:'regtest',outputsConsistent:true,tipStableDuringRead:true,
 fundingTxid:txid,releaseCount:24,
 verifiedOutputs:Array.from({length:24},(_,index)=>({index,txid,vout:index,sats:12000+index*1000}))};
const approvedIntent={expectedTxid:txid,vout:7,expectedSats:19000,destinationSats:18000,
 destinationScriptHex:'0014'+'11'.repeat(20),locktime:1800000000,signerPubkeyHex:'02'+'22'.repeat(32)};
const inspect=(e=giftEvidence,i=7,a=approvedIntent)=>inspectBeneficiaryIntentAgainstGift({giftEvidence:e,releaseIndex:i,approvedIntent:a});

test('exact selected release matches 24-output gift but cannot authorize QR or signing',()=>{
 const r=inspect();
 assert.equal(r.releaseIndex,7);
 assert.equal(r.feeSats,1000);
 assert.equal(r.proposedIntentMatchesGift,true);
 assert.equal(r.beneficiaryAuthorized,false);
 assert.equal(r.canExportSigningQr,false);
 assert.equal(r.canSign,false);
 assert.equal(r.canBroadcast,false);
});

test('rejects selecting a different gift release or changing funding amount',()=>{
 assert.throws(()=>inspect(giftEvidence,8),/output mismatch/);
 assert.throws(()=>inspect(giftEvidence,7,{...approvedIntent,expectedSats:20000}),/amount mismatch/);
 assert.throws(()=>inspect(giftEvidence,7,{...approvedIntent,expectedTxid:'b'.repeat(64)}),/txid mismatch/);
});

test('rejects incomplete chain evidence, malformed destination and unsafe payout',()=>{
 assert.throws(()=>inspect({...giftEvidence,tipStableDuringRead:false}),/Stable Core tip/);
 assert.throws(()=>inspect({...giftEvidence,verifiedOutputs:giftEvidence.verifiedOutputs.slice(1)}),/Complete verified gift/);
 assert.throws(()=>inspect(giftEvidence,7,{...approvedIntent,destinationSats:19000}),/Invalid payout/);
 assert.throws(()=>inspect(giftEvidence,7,{...approvedIntent,destinationScriptHex:'not-a-script'}),/Destination script/);
});
