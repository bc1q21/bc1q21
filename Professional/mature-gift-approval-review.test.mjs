import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatureGiftApprovalReview} from './mature-gift-approval-review.mjs';
const digest='a'.repeat(64);
const giftReview={network:'regtest',releaseIndex:7,giftOutputMatched:true,exactPsbtMatched:true,
 transactionConfirmation:{network:'regtest',signed:false,broadcast:false,approvalVerified:true,
  psbtSha256:digest,locktime:1800000000,locktimeType:'timestamp'}};
const maturity={network:'regtest',releaseIndex:7,cltvMatureForNextBlock:true,
 readyForApprovalReview:true,canExportSigningQr:false,locktime:1800000000,locktimeType:'timestamp'};
const make=(g=giftReview,m=maturity)=>createMatureGiftApprovalReview({giftReview:g,maturity:m});

test('mature matching gift can enter explicit confirmation but never QR export',()=>{
 const session=make();
 assert.equal(session.view().explicitlyApproved,false);
 assert.throws(()=>session.approve({acknowledged:true,confirmedDigest:'b'.repeat(64)}),/fingerprint/);
 session.approve({acknowledged:true,confirmedDigest:digest});
 assert.equal(session.view().explicitlyApproved,true);
 assert.equal(session.canExportSigningQr,false);
 assert.equal(session.canSign,false);
 assert.equal(session.canBroadcast,false);
 session.revoke();
 assert.equal(session.view().explicitlyApproved,false);
});

test('immature or mismatched release cannot even enter approval',()=>{
 assert.throws(()=>make(giftReview,{...maturity,cltvMatureForNextBlock:false}),/not mature/);
 assert.throws(()=>make(giftReview,{...maturity,releaseIndex:8}),/wrong release/);
 assert.throws(()=>make(giftReview,{...maturity,locktime:1800000001}),/Timelock changed/);
 assert.throws(()=>make(giftReview,{...maturity,canExportSigningQr:true}),/must not grant QR/);
 assert.throws(()=>make({...giftReview,exactPsbtMatched:false}),/Exact PSBT/);
});
