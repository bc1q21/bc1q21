import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFreshApprovedGiftOutpoint} from './approved-gift-freshness-preflight.mjs';
const txid='a'.repeat(64),tip='b'.repeat(64),digest='c'.repeat(64),script='0014'+'11'.repeat(20);
const giftEvidence={network:'regtest',outputsConsistent:true,tipStableDuringRead:true,
 observedTip:tip,fundingTxid:txid,verifiedOutputs:[{index:0,txid,vout:0,sats:12000,scriptPubKeyHex:script}]};
const receipt={network:'regtest',approvalRecorded:true,releaseIndex:0,observedTip:tip,psbtSha256:digest};
const rpcFor=({moving=false,spent=false,wrongAmount=false,wrongScript=false}={})=>{
 let tips=0;
 return async method=>{
  if(method==='getbestblockhash')return moving&&++tips===2?'d'.repeat(64):tip;
  if(method==='getblockchaininfo')return {chain:'regtest',bestblockhash:tip};
  if(method==='gettxout')return spent?null:{bestblock:tip,confirmations:2,value:wrongAmount?0.00013:0.00012,scriptPubKey:{hex:wrongScript?'0014'+'22'.repeat(20):script}};
  throw Error('Unexpected RPC method');
 };
};
const inspect=(rpc,g=giftEvidence,a=receipt)=>inspectFreshApprovedGiftOutpoint({
 rpc,giftEvidence:g,approvalReceipt:a,releaseIndex:0
});
test('fresh same-tip approved outpoint is still not signing permission',async()=>{
 const result=await inspect(rpcFor());
 assert.equal(result.freshOutpointMatched,true);
 assert.equal(result.canExportSigningQr,false);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
 assert.equal(result.beneficiaryAuthorized,false);
});
test('approval is invalid after reorg or if UTXO is spent',async()=>{
 await assert.rejects(inspect(rpcFor({moving:true})),/Chain tip changed during recheck/);
 await assert.rejects(inspect(rpcFor({spent:true})),/spent or tip changed/);
 await assert.rejects(inspect(rpcFor({wrongAmount:true})),/amount changed/);
 await assert.rejects(inspect(rpcFor({wrongScript:true})),/locking script changed/);
 await assert.rejects(inspect(rpcFor(),{...giftEvidence,verifiedOutputs:[{...giftEvidence.verifiedOutputs[0],scriptPubKeyHex:undefined}]}),/Verified gift output script required/);
 await assert.rejects(inspect(rpcFor(),giftEvidence,{...receipt,observedTip:'d'.repeat(64)}),/Approval chain tip mismatch/);
});
test('approval for another release or unrecorded approval is rejected',async()=>{
 await assert.rejects(inspect(rpcFor(),giftEvidence,{...receipt,releaseIndex:1}),/another release/);
 await assert.rejects(inspect(rpcFor(),giftEvidence,{...receipt,approvalRecorded:false}),/Explicit approval/);
});
