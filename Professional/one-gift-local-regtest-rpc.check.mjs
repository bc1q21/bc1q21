import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalRegtestReadOnlyRpc,inspectOneGiftUsingLocalRegtestCore} from './one-gift-local-regtest-rpc.mjs';
test('read-only local regtest transport rejects missing credentials and unsupported methods',async()=>{
 assert.throws(()=>createLocalRegtestReadOnlyRpc({username:'',password:''}),/credentials required/);
 assert.throws(()=>createLocalRegtestReadOnlyRpc({username:'disposable',password:'test',port:0}),/Invalid RPC port/);
 const rpc=createLocalRegtestReadOnlyRpc({username:'disposable',password:'test',port:18443});
 await assert.rejects(rpc('sendrawtransaction',['00']),/Non-read-only/);
 await assert.rejects(rpc('generatetoaddress',[1,'bcrt1']),/Non-read-only/);
 await assert.rejects(rpc('dumpprivkey',[]),/Non-read-only/);
 await assert.rejects(rpc('getwalletinfo',[]),/Non-read-only/);
});
test('cannot certify funding from injected Core-like data or missing local node',async()=>{
 await assert.rejects(inspectOneGiftUsingLocalRegtestCore({
   expectedFundingTxid:'a'.repeat(64),chainInfo:{chain:'regtest'},observations:[{value:1}]
 },{username:'test',password:'test',port:1}),/Local regtest RPC unavailable|timed out/);
});
