import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {inspectAllGiftOutputsViaLocalRegtest} from './local-regtest-all-gift-bridge.mjs';

const txid='a'.repeat(64),tip='b'.repeat(64),block='c'.repeat(64);
const releases=Array.from({length:24},(_,index)=>({
 index,vout:index,sats:10000+index*1000,
 scriptPubKeyHex:'0014'+index.toString(16).padStart(2,'0').repeat(20)
}));
const binding={network:'regtest',fundingTxid:txid,releaseOutputs:releases};
const authorization='Basic '+Buffer.from('fixture:disposable').toString('base64');

async function serveCore({wrongNetwork=false,spentIndex=-1}={},fn) {
 const server=http.createServer((req,res)=>{
  if(req.headers.authorization!==authorization){res.writeHead(401);res.end();return;}
  let body='';
  req.on('data',part=>body+=part);
  req.on('end',()=>{
   const {method,params}=JSON.parse(body);
   const values={
    getbestblockhash:tip,
    getblockchaininfo:{chain:wrongNetwork?'main':'regtest',bestblockhash:tip},
    getrawtransaction:{txid,blockhash:block,vout:releases.map(r=>({
     n:r.vout,value:r.sats/1e8,scriptPubKey:{hex:r.scriptPubKeyHex}
    }))},
    getblockheader:{hash:block,confirmations:6},
    gettxout:params[1]===spentIndex?null:{
     bestblock:tip,confirmations:6,value:releases[params[1]].sats/1e8,
     scriptPubKey:{hex:releases[params[1]].scriptPubKeyHex}
    }
   };
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({result:values[method],error:null}));
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {await fn(server.address().port);}
 finally {await new Promise(resolve=>server.close(resolve));}
}

test('credentialed loopback bridge inspects 24 outputs but cannot authorize signing',async()=>{
 await serveCore({},async port=>{
  const result=await inspectAllGiftOutputsViaLocalRegtest({port,authorization,binding});
  assert.equal(result.releaseCount,24);
  assert.equal(result.rpcTransportAuthenticated,true);
  assert.equal(result.creatorAuthenticated,false);
  assert.equal(result.beneficiaryAuthorized,false);
  assert.equal(result.canExportSigningQr,false);
  assert.equal(result.canSign,false);
  assert.equal(result.canBroadcast,false);
 });
});

test('bridge rejects wrong credentials, network and spent release',async()=>{
 await serveCore({},async port=>{
  await assert.rejects(inspectAllGiftOutputsViaLocalRegtest({
   port,authorization:'Basic invalid',binding
  }),/rejected/);
 });
 await serveCore({wrongNetwork:true},async port=>{
  await assert.rejects(inspectAllGiftOutputsViaLocalRegtest({port,authorization,binding}),/Regtest only/);
 });
 await serveCore({spentIndex:23},async port=>{
  await assert.rejects(inspectAllGiftOutputsViaLocalRegtest({port,authorization,binding}),/spent or unconfirmed/);
 });
});
