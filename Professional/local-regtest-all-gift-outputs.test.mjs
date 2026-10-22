import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAllGiftOutputsWithLocalCore} from './local-regtest-all-gift-outputs.mjs';

const txid='a'.repeat(64),tip='b'.repeat(64),block='c'.repeat(64);
const scripts=Array.from({length:24},(_,i)=>'0014'+i.toString(16).padStart(2,'0').repeat(20));
const releaseOutputs=scripts.map((script,index)=>({index,vout:index,sats:12000+index*1000,scriptPubKeyHex:script}));
const binding={network:'regtest',fundingTxid:txid,releaseOutputs};
function fixture(overrides={}) {
 const calls=[];
 const rpc=async(method,params=[])=>{
  calls.push(method);
  const defaults={
   getbestblockhash:tip,
   getblockchaininfo:{chain:'regtest',bestblockhash:tip},
   getrawtransaction:{txid,blockhash:block,vout:releaseOutputs.map(o=>({
    n:o.vout,value:o.sats/100000000,scriptPubKey:{hex:o.scriptPubKeyHex}
   }))},
   getblockheader:{hash:block,confirmations:10},
   gettxout:()=>{const o=releaseOutputs[params[1]];return {bestblock:tip,confirmations:10,value:o.sats/100000000,scriptPubKey:{hex:o.scriptPubKeyHex}};}
  };
  const value=Object.hasOwn(overrides,method)?overrides[method]:defaults[method];
  return typeof value==='function'?value(params,calls):value;
 };
 return {rpc,calls};
}

test('collects all 24 gift outputs at one stable tip without spend authority',async()=>{
 const {rpc,calls}=fixture();
 const result=await inspectAllGiftOutputsWithLocalCore({rpc,binding});
 assert.equal(result.releaseCount,24);
 assert.equal(calls.filter(x=>x==='gettxout').length,24);
 assert.equal(result.tipStableDuringRead,true);
 assert.equal(result.beneficiaryAuthorized,false);
 assert.equal(result.canExportSigningQr,false);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
});

test('rejects a missing or spent release output',async()=>{
 const {rpc}=fixture({gettxout:([,vout])=>vout===23?null:{
  bestblock:tip,confirmations:10,value:releaseOutputs[vout].sats/100000000,
  scriptPubKey:{hex:releaseOutputs[vout].scriptPubKeyHex}
 }});
 await assert.rejects(inspectAllGiftOutputsWithLocalCore({rpc,binding}),/spent or unconfirmed/);
});

test('rejects reorganization, wrong network and unconfirmed funding',async()=>{
 const moving=fixture({getbestblockhash:(_p,calls)=>calls.filter(x=>x==='getbestblockhash').length===2?'d'.repeat(64):tip});
 await assert.rejects(inspectAllGiftOutputsWithLocalCore({rpc:moving.rpc,binding}),/Chain tip changed/);
 const wrong=fixture({getblockchaininfo:{chain:'main',bestblockhash:tip}});
 await assert.rejects(inspectAllGiftOutputsWithLocalCore({rpc:wrong.rpc,binding}),/Regtest only/);
 const unconfirmed=fixture({getblockheader:{hash:block,confirmations:0}});
 await assert.rejects(inspectAllGiftOutputsWithLocalCore({rpc:unconfirmed.rpc,binding}),/not confirmed/);
});

test('rejects missing release list and oversized observations',async()=>{
 const {rpc}=fixture();
 await assert.rejects(inspectAllGiftOutputsWithLocalCore({rpc,binding:{...binding,releaseOutputs:[]}}),/Bounded gift release/);
 await assert.rejects(inspectAllGiftOutputsWithLocalCore({rpc,binding:{...binding,releaseOutputs:Array(101).fill(releaseOutputs[0])}}),/Bounded gift release/);
});
