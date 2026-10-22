import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createRegtestReadOnlyRpc} from './local-regtest-readonly-transport.mjs';
import {collectProfessionalCoreSnapshot} from './core-readonly-snapshot.mjs';

const tip='a'.repeat(64), block='b'.repeat(64), txid='c'.repeat(64);
const authorization='Basic '+Buffer.from('regtest-fixture:disposable').toString('base64');

async function withCoreFixture(overrides,run) {
 const calls=[];
 const server=http.createServer((req,res)=>{
  if(req.headers.authorization!==authorization){res.writeHead(401);res.end();return;}
  let body='';
  req.on('data',c=>body+=c);
  req.on('end',()=>{
   const {method,params}=JSON.parse(body);
   calls.push(method);
   const values={
    getbestblockhash:tip,
    getblockchaininfo:{chain:'regtest',blocks:100,bestblockhash:tip},
    getblockheader:params[0]===tip?{hash:tip,height:100,mediantime:1800000000}:{hash:block,height:50,confirmations:51},
    getrawtransaction:{txid,blockhash:block,vout:[{n:0,value:0.001,scriptPubKey:{hex:'0014'+'ab'.repeat(20)}}]},
    gettxout:{bestblock:tip,value:0.001,confirmations:51,scriptPubKey:{hex:'0014'+'ab'.repeat(20)}}
   };
   const value=typeof overrides[method]==='function'?overrides[method](values[method],calls):Object.hasOwn(overrides,method)?overrides[method]:values[method];
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({result:value,error:null}));
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {await run(server.address().port,calls);}
 finally {await new Promise(resolve=>server.close(resolve));}
}

test('credentialed loopback collection checks coherent regtest outpoint and remains non-authorizing',async()=>{
 await withCoreFixture({},async port=>{
  const rpc=createRegtestReadOnlyRpc({port,authorization});
  const snapshot=await collectProfessionalCoreSnapshot({rpc,txid,vout:0});
  assert.equal(snapshot.tipStableDuringRead,true);
  assert.equal(snapshot.chainTip.chain,'regtest');
  assert.equal(snapshot.rpcTransportAuthenticated,false);
  assert.equal(snapshot.canSign,false);
  assert.equal(snapshot.canBroadcast,false);
 });
});

test('invalid RPC credentials cannot yield a snapshot',async()=>{
 await withCoreFixture({},async port=>{
  const rpc=createRegtestReadOnlyRpc({port,authorization:'Basic invalid'});
  await assert.rejects(collectProfessionalCoreSnapshot({rpc,txid,vout:0}),/rejected/);
 });
});

test('wrong network fails closed over local transport',async()=>{
 await withCoreFixture({getblockchaininfo:{chain:'main',blocks:100,bestblockhash:tip}},async port=>{
  const rpc=createRegtestReadOnlyRpc({port,authorization});
  await assert.rejects(collectProfessionalCoreSnapshot({rpc,txid,vout:0}),/Regtest only/);
 });
});

test('tip movement during RPC snapshot fails closed',async()=>{
 await withCoreFixture({getbestblockhash:(value,calls)=>calls.filter(x=>x==='getbestblockhash').length===2?'d'.repeat(64):value},async port=>{
  const rpc=createRegtestReadOnlyRpc({port,authorization});
  await assert.rejects(collectProfessionalCoreSnapshot({rpc,txid,vout:0}),/Chain tip changed/);
 });
});

test('missing or spent gift outpoint fails closed',async()=>{
 await withCoreFixture({gettxout:null},async port=>{
  const rpc=createRegtestReadOnlyRpc({port,authorization});
  await assert.rejects(collectProfessionalCoreSnapshot({rpc,txid,vout:0}),/absent or spent/);
 });
});

test('wrong requested gift transaction fails closed',async()=>{
 await withCoreFixture({},async port=>{
  const rpc=createRegtestReadOnlyRpc({port,authorization});
  await assert.rejects(collectProfessionalCoreSnapshot({rpc,txid:'d'.repeat(64),vout:0}),/Wrong funding transaction/);
 });
});
