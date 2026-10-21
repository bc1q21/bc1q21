// Professional Node-only read-only regtest RPC snapshot collector.
// rpc(method, params) must be supplied by a separately authenticated local
// Bitcoin Core transport. This module NEVER confers transport trust or signing
// permission. No secrets, wallet RPC, signing, broadcasting or browser APIs.
import assert from 'node:assert/strict';
const hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
export async function collectProfessionalCoreSnapshot({rpc,txid,vout}) {
 assert.equal(typeof rpc,'function','Authenticated RPC transport callback required');
 assert.ok(hash(txid)&&Number.isSafeInteger(vout)&&vout>=0,'Invalid public outpoint');
 // Sample tip before and after all queries: reject concurrent tip changes.
 const start=await rpc('getbestblockhash',[]);
 assert.ok(hash(start),'Invalid initial tip hash');
 const chainInfo=await rpc('getblockchaininfo',[]);
 assert.equal(chainInfo?.chain,'regtest','Regtest only');
 const tip=await rpc('getblockheader',[start,true]);
 assert.equal(tip?.hash,start,'Tip header does not match sampled hash');
 assert.ok(Number.isSafeInteger(tip.height)&&tip.height>=0,'Invalid tip height');
 assert.ok(Number.isSafeInteger(tip.mediantime)&&tip.mediantime>=0,'Invalid tip median time');
 const transaction=await rpc('getrawtransaction',[txid,true]);
 assert.equal(transaction?.txid,txid,'Wrong funding transaction');
 assert.ok(hash(transaction.blockhash),'Funding transaction is not confirmed');
 const blockHeader=await rpc('getblockheader',[transaction.blockhash,true]);
 const txout=await rpc('gettxout',[txid,vout,false]);
 assert.ok(txout!==null&&txout!==undefined,'Funding outpoint absent or spent');
 assert.equal(txout.bestblock,start,'UTXO response tip differs from sampled tip');
 const end=await rpc('getbestblockhash',[]);
 assert.equal(end,start,'Chain tip changed during evidence collection; retry');
 assert.equal(chainInfo.bestblockhash,start,'Chain info tip differs from sampled tip');
 assert.equal(chainInfo.blocks,tip.height,'Chain info height differs from sampled tip');
 return Object.freeze({
  coreEvidence:Object.freeze({chainInfo,transaction,blockHeader,txout}),
  chainTip:Object.freeze({chain:'regtest',blocks:tip.height,bestblockhash:start,mediantime:tip.mediantime}),
  tipStableDuringRead:true,
  rpcTransportAuthenticated:false, // caller must prove independently
  recipientAuthorized:false,canSign:false,canBroadcast:false
 });
}
