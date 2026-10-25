import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import bitcoin from 'bitcoinjs-lib';
import {sha256} from '@noble/hashes/sha256';
import {inspectSelectedReleaseWithLocalCore} from './selected-release-core-preflight.mjs';
const source=readFileSync('Professional/browser-integration/browser-verifier-entry.mjs','utf8');
const approvedUnsignedBase64=source.match(/const approved='([^']+)'/)?.[1];
assert.ok(approvedUnsignedBase64);
const psbt=bitcoin.Psbt.fromBase64(approvedUnsignedBase64);
const tx=bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());
const prev=bitcoin.Transaction.fromBuffer(psbt.data.inputs[0].nonWitnessUtxo);
const release={releaseNumber:1,fundingTxid:prev.getId(),fundingVout:tx.ins[0].index,
 lockHeight:tx.locktime,amountSats:tx.outs[0].value,destinationScriptHex:tx.outs[0].script.toString('hex'),
 fundingScriptHex:prev.outs[tx.ins[0].index].script.toString('hex'),
 inputSats:prev.outs[tx.ins[0].index].value};
const gift={network:'regtest',fundingAddress:'bc1q21publicgiftlocator12345678901234567890'};
const expectedApprovedSha256=Buffer.from(sha256(Buffer.from(approvedUnsignedBase64,'base64'))).toString('hex');
const tip='a'.repeat(64);
const utxo={bestblock:tip,confirmations:3,value:release.inputSats/1e8,
 scriptPubKey:{hex:release.fundingScriptHex}};
function makeRpc({height=release.lockHeight,spent=false,wrongScript=false,moving=false,chain='regtest'}={}){
 let tipReads=0;
 return async (method,params)=>{
  if(method==='getbestblockhash')return moving&&++tipReads===2?'b'.repeat(64):tip;
  if(method==='getblockchaininfo')return {chain,bestblockhash:tip,blocks:height};
  if(method==='gettxout'){
   assert.deepEqual(params,[release.fundingTxid,release.fundingVout,false]);
   return spent?null:wrongScript?{...utxo,scriptPubKey:{hex:'6a'}}:utxo;
  }
  if(method==='getblockheader')return {hash:tip,height,mediantime:1800000000};
  throw Error('Unexpected RPC method '+method);
 };
}
const run=(rpc,selected=release)=>inspectSelectedReleaseWithLocalCore({rpc,gift,release:selected,
 approvedUnsignedBase64,expectedApprovedSha256});
test('local Core release preflight checks exact outpoint and maturity but never authorizes signing',async()=>{
 const result=await run(makeRpc());
 assert.equal(result.utxoSnapshotMatchesSelectedRelease,true);
 assert.equal(result.cltvMatureForNextBlock,true);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
 assert.equal(result.rpcTransportAuthenticated,false);
 const locked=await run(makeRpc({height:release.lockHeight-1}));
 assert.equal(locked.cltvMatureForNextBlock,false);
 assert.equal(locked.readyForReview,false);
});
test('spent, script mismatch, wrong chain, moving tip and changed release all fail closed',async()=>{
 await assert.rejects(run(makeRpc({spent:true})));
 await assert.rejects(run(makeRpc({wrongScript:true})));
 await assert.rejects(run(makeRpc({chain:'main'})));
 await assert.rejects(run(makeRpc({moving:true})));
 await assert.rejects(run(makeRpc(),{...release,amountSats:release.amountSats+1}));
});
