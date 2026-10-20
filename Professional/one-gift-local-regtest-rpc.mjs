// Professional-only Bitcoin Core LOCAL REGTEST read-only RPC evidence acquisition.
// Never accepts caller-supplied RPC replies as verified evidence. No wallet RPC,
// keys, signing, transaction submission, mainnet or remote-host connections.
import assert from 'node:assert/strict';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import {bindOneGiftToRawFundingTransaction} from './one-gift-raw-funding-binding.mjs';
import {inspectOneGiftCoreUtxos} from './one-gift-core-utxo-continuity.mjs';

const allowed=new Set(['getblockchaininfo','getrawtransaction','gettxout','getblockheader','getbestblockhash']);
export function createLocalRegtestReadOnlyRpc({username,password,port=18443}) {
 assert.ok(typeof username==='string'&&username.length>0&&typeof password==='string'&&password.length>0,
  'Explicit local regtest RPC credentials required');
 assert.ok(Number.isInteger(port)&&port>=1&&port<=65535,'Invalid RPC port');
 const authorization='Basic '+Buffer.from(username+':'+password).toString('base64');
 return async function rpc(method,params=[]) {
  assert.ok(allowed.has(method),'Non-read-only Bitcoin Core method forbidden');
  assert.ok(Array.isArray(params),'RPC parameters must be an array');
  const payload=JSON.stringify({jsonrpc:'1.0',id:'professional-regtest-readonly',method,params});
  return await new Promise((resolve,reject)=>{
   const req=http.request({host:'127.0.0.1',port,path:'/',method:'POST',timeout:5000,
    headers:{authorization,'content-type':'application/json','content-length':Buffer.byteLength(payload)}},res=>{
    let data='';
    res.setEncoding('utf8');
    res.on('data',chunk=>{data+=chunk;if(data.length>2000000)req.destroy(Error('RPC response too large'))});
    res.on('end',()=>{
     if(res.statusCode!==200)return reject(Error('Local Bitcoin Core RPC failed'));
     try {
      const parsed=JSON.parse(data);
      if(!parsed||parsed.id!=='professional-regtest-readonly'||parsed.error!==null||!Object.hasOwn(parsed,'result'))
       throw Error('Unexpected Bitcoin Core RPC response');
      resolve(parsed.result);
     }catch{return reject(Error('Malformed local regtest RPC response'))}
    });
   });
   req.on('timeout',()=>req.destroy(Error('Local regtest RPC timed out')));
   req.on('error',()=>reject(Error('Local regtest RPC unavailable')));
   req.end(payload);
  });
 };
}
export async function inspectOneGiftUsingLocalRegtestCore(gift,credentials) {
 const rpc=createLocalRegtestReadOnlyRpc(credentials);
 const start=await rpc('getblockchaininfo');
 assert.equal(start.chain,'regtest','Refuse non-regtest Bitcoin Core');
 assert.match(start.bestblockhash,/^[0-9a-f]{64}$/);
 assert.ok(Number.isSafeInteger(start.blocks)&&start.blocks>=0);
 // Caller supplies public gift specification and txid, NEVER authoritative raw tx.
 assert.match(gift?.expectedFundingTxid||'',/^[0-9a-f]{64}$/,'Expected public funding txid required');
 const tx=await rpc('getrawtransaction',[gift.expectedFundingTxid,true]);
 assert.equal(tx.txid,gift.expectedFundingTxid,'Core funding txid mismatch');
 assert.match(tx.blockhash||'',/^[0-9a-f]{64}$/,'Funding not confirmed in a block');
 const header=await rpc('getblockheader',[tx.blockhash,true]);
 assert.equal(header.hash,tx.blockhash,'Block header mismatch');
 assert.ok(Number.isSafeInteger(header.height)&&header.height>=1&&header.confirmations>=1,
  'Funding block unconfirmed or disconnected');
 const raw=await rpc('getrawtransaction',[gift.expectedFundingTxid,false]);
 const decoded=bitcoin.Transaction.fromHex(raw);
 assert.equal(decoded.getId(),tx.txid,'Raw funding bytes do not match Core transaction');
 const binding=bindOneGiftToRawFundingTransaction(gift.giftUrl,gift.published,gift.commitment,raw);
 assert.equal(binding.fundingTxid,gift.expectedFundingTxid,'Gift funding transaction differs');
 const observations=[];
 for(const output of binding.releaseOutputs){
  const response=await rpc('gettxout',[binding.fundingTxid,output.vout,true]);
  observations.push({txid:binding.fundingTxid,vout:output.vout,response});
 }
 const finish=await rpc('getblockchaininfo');
 assert.equal(finish.chain,'regtest','Chain changed away from regtest');
 assert.equal(finish.bestblockhash,start.bestblockhash,'Regtest chain tip changed during inspection');
 assert.equal(finish.blocks,start.blocks,'Regtest height changed during inspection');
 assert.ok(header.height<=finish.blocks,'Funding block above current tip');
 const confirmation=await rpc('getblockheader',[tx.blockhash,true]);
 assert.ok(confirmation.confirmations>=1&&confirmation.hash===header.hash&&confirmation.height===header.height,
  'Funding block disconnected during inspection');
 const evidence=inspectOneGiftCoreUtxos(binding,finish,observations);
 assert.ok(evidence.outputs.every(x=>x.reportedConfirmations>=1),'Unconfirmed output');
 return Object.freeze({
  format:'bc1q21-professional-local-regtest-rpc-observation-v1',network:'regtest',
  fundingTxid:binding.fundingTxid,releaseCount:binding.releaseCount,
  tipHash:finish.bestblockhash,tipHeight:finish.blocks,fundingBlockHash:tx.blockhash,
  confirmedAndUnspentAtObservedTip:true,localRpcQueried:true,
  // Authenticated loopback is a bounded observation; it does NOT attest node
  // software, creator identity, recipient control, or future chain continuity.
  nodeIdentityAttested:false,creatorAuthenticated:false,recipientAuthenticated:false,
  readyForLiveRouting:false,canSign:false,canBroadcast:false
 });
}
