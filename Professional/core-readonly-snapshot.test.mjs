import test from 'node:test';
import assert from 'node:assert/strict';
import {collectProfessionalCoreSnapshot} from './core-readonly-snapshot.mjs';
const tip='a'.repeat(64), block='b'.repeat(64), txid='c'.repeat(64);
const mock=async(method,args)=>{
 switch(method){
 case 'getbestblockhash':return tip;
 case 'getblockchaininfo':return {chain:'regtest',blocks:100,bestblockhash:tip};
 case 'getblockheader':return args[0]===tip?{hash:tip,height:100,mediantime:1800000000}:{hash:block,height:50,confirmations:51};
 case 'getrawtransaction':return {txid,blockhash:block,vout:[]};
 case 'gettxout':return {bestblock:tip,value:0.001,confirmations:51,scriptPubKey:{hex:'0014'+'ab'.repeat(20)}};
 default:throw Error('Unexpected RPC');
 }
};
test('collects stable public Core evidence but never authenticates transport',async()=>{
 const result=await collectProfessionalCoreSnapshot({rpc:mock,txid,vout:0});
 assert.equal(result.tipStableDuringRead,true);
 assert.equal(result.chainTip.mediantime,1800000000);
 assert.equal(result.rpcTransportAuthenticated,false);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
});
test('rejects tip movement during snapshot',async()=>{
 let n=0;
 const rpc=async(m,a)=>m==='getbestblockhash'&&++n===2?'d'.repeat(64):mock(m,a);
 await assert.rejects(collectProfessionalCoreSnapshot({rpc,txid,vout:0}),/Chain tip changed/);
});
test('rejects unspent response from different tip',async()=>{
 const rpc=async(m,a)=>m==='gettxout'?{bestblock:'d'.repeat(64)}:mock(m,a);
 await assert.rejects(collectProfessionalCoreSnapshot({rpc,txid,vout:0}),/UTXO response tip differs/);
});
test('rejects non-regtest and absent outpoint',async()=>{
 await assert.rejects(collectProfessionalCoreSnapshot({rpc:async(m,a)=>m==='getblockchaininfo'?{chain:'main'}:mock(m,a),txid,vout:0}),/Regtest only/);
 await assert.rejects(collectProfessionalCoreSnapshot({rpc:async(m,a)=>m==='gettxout'?null:mock(m,a),txid,vout:0}),/absent or spent/);
});
test('never calls mutating or signing RPC methods',async()=>{
 const methods=[];
 await collectProfessionalCoreSnapshot({rpc:async(m,a)=>{methods.push(m);return mock(m,a)},txid,vout:0});
 assert.deepEqual([...new Set(methods)].sort(),['getbestblockhash','getblockchaininfo','getblockheader','getrawtransaction','gettxout'].sort());
});
