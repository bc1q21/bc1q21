import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGiftBoundMaturityWithCore} from './gift-bound-core-maturity-preflight.mjs';
const tip='a'.repeat(64),txid='b'.repeat(64),locktime=1800000000;
const giftEvidence={network:'regtest',outputsConsistent:true,tipStableDuringRead:true,observedTip:tip,
 fundingTxid:txid,verifiedOutputs:[{vout:0,sats:12000}]};
const review={network:'regtest',giftOutputMatched:true,exactPsbtMatched:true,releaseIndex:0,
 transactionConfirmation:{network:'regtest',signed:false,broadcast:false,fundingTxid:txid,
 fundingVout:0,inputSats:12000,locktime,locktimeType:'timestamp'}};
function rpcFor({mtp=locktime+1,height=100,chain='regtest',moving=false}={}) {
 let reads=0;
 return async method=>{
  if(method==='getbestblockhash')return moving&&++reads===2?'c'.repeat(64):tip;
  if(method==='getblockchaininfo')return {chain,bestblockhash:tip,blocks:height};
  if(method==='getblockheader')return {hash:tip,height,mediantime:mtp};
  throw Error('Unexpected RPC');
 };
}
const inspect=(rpc,g=giftEvidence,r=review)=>inspectGiftBoundMaturityWithCore({rpc,giftEvidence:g,review:r});

test('calendar CLTV requires strictly greater median time past',async()=>{
 const mature=await inspect(rpcFor());
 assert.equal(mature.cltvMatureForNextBlock,true);
 assert.equal(mature.readyForApprovalReview,true);
 assert.equal(mature.canExportSigningQr,false);
 assert.equal(mature.canSign,false);
 assert.equal(mature.canBroadcast,false);
 const equal=await inspect(rpcFor({mtp:locktime}));
 assert.equal(equal.cltvMatureForNextBlock,false);
 const earlier=await inspect(rpcFor({mtp:locktime-1}));
 assert.equal(earlier.readyForApprovalReview,false);
});

test('height CLTV uses next-block height, not current height',async()=>{
 const heightReview={...review,transactionConfirmation:{...review.transactionConfirmation,locktime:101,locktimeType:'block-height'}};
 assert.equal((await inspect(rpcFor({height:100}),giftEvidence,heightReview)).cltvMatureForNextBlock,false);
 assert.equal((await inspect(rpcFor({height:101}),giftEvidence,heightReview)).cltvMatureForNextBlock,true);
});

test('rejects chain tip change, wrong network and altered gift evidence',async()=>{
 await assert.rejects(inspect(rpcFor({moving:true})),/Tip changed/);
 await assert.rejects(inspect(rpcFor({chain:'main'})),/regtest/);
 await assert.rejects(inspect(rpcFor(),{...giftEvidence,observedTip:'c'.repeat(64)}),/Recollect/);
 await assert.rejects(inspect(rpcFor(),giftEvidence,{...review,transactionConfirmation:{...review.transactionConfirmation,inputSats:9999}}),/Expected values to be strictly equal/);
});
