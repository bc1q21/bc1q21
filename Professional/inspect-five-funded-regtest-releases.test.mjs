import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectFiveFundedRegtestReleases,createLocalProfessionalRegtestInspector} from './inspect-five-funded-regtest-releases.mjs';
const gift=JSON.parse(readFileSync('Professional/artifacts/five-funded-recipient-gift-regtest.json','utf8'));
const psbts=JSON.parse(readFileSync('Professional/artifacts/five-funded-recipient-psbts-regtest.json','utf8'));
const rpc=createLocalProfessionalRegtestInspector({
 authorization:'Basic '+Buffer.from('professional:synthetic-only').toString('base64')});
const result=await inspectFiveFundedRegtestReleases({gift,psbts,rpc});
assert.equal(result.releases.length,5);
assert.equal(result.allFiveConfirmedUnspent,true);
assert.equal(result.signingAuthorized,false);
assert.equal(result.canBroadcast,false);
assert.equal(result.releases.every(x=>x.fundedConfirmedUnspent&&x.coreUtxoMatches),true);
assert.equal(new Set(result.releases.map(x=>x.txid+':'+x.vout)).size,5);
assert.equal(result.releases.every(x=>x.maturedForNextBlock),true);
await assert.rejects(()=>inspectFiveFundedRegtestReleases({
 gift:{...gift,releases:gift.releases.map((r,i)=>i===0?{...r,inputSats:r.inputSats+1}:r)},
 psbts,rpc}),/funding amount mismatch/);
await assert.rejects(()=>inspectFiveFundedRegtestReleases({
 gift,psbts,rpc:async(method,args)=>{
  const response=await rpc(method,args);
  if(method==='gettxout'&&args[1]===gift.releases[0].fundingVout)
   return {...response,value:response.value+0.00000001};
  return response;
 }}),/Core UTXO value or locking script differs/);
await assert.rejects(()=>inspectFiveFundedRegtestReleases({
 gift,psbts,rpc:async(method,args)=>{
  if(method==='gettxout'&&args[1]===gift.releases[0].fundingVout)return null;
  return rpc(method,args);
 }}),/absent or spent/);
assert.match(result.consistentChainTip,/^[a-f0-9]{64}$/);
await assert.rejects(()=>inspectFiveFundedRegtestReleases({
 gift,psbts:[psbts[0],psbts[0],...psbts.slice(2)],rpc
}),/Duplicate or invalid release PSBT number/);
let tipReads=0;
await assert.rejects(()=>inspectFiveFundedRegtestReleases({
 gift,psbts,rpc:async(method,args)=>{
  const response=await rpc(method,args);
  // Return a valid but different tip on the next release's first read.
  // The underlying Core snapshot is stable within each individual read.
  if(method==='getbestblockhash'&&++tipReads===3)
   return 'f'.repeat(64);
  return response;
 }}));
await assert.rejects(()=>inspectFiveFundedRegtestReleases({
 gift,psbts,rpc:async(method,args)=>{
  const response=await rpc(method,args);
  if(method==='getrawtransaction'&&args[0]===gift.releases[0].fundingTxid)
   return {...response,confirmations:response.confirmations+1};
  return response;
 }}),/Funding confirmation depth differs/);
await assert.rejects(()=>inspectFiveFundedRegtestReleases({
 gift,psbts,rpc:async(method,args)=>{
  const response=await rpc(method,args);
  if(method==='gettxout'&&args[1]===gift.releases[0].fundingVout)
   return {...response,confirmations:response.confirmations+1};
  return response;
 }}),/UTXO confirmations differ/);
console.log('PASS: real read-only Bitcoin Core checks all five funded unspent releases, CLTV maturity and rejects fabricated UTXO.');
