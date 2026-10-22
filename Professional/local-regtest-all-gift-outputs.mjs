// Professional regtest only. Collect every gift release UTXO at a stable
// Bitcoin Core tip and verify against the same confirmed funding transaction.
// No signing, broadcasting, wallet calls, or beneficiary authorization.
import assert from 'node:assert/strict';
import {verifyScheduledGiftCoreOutputs} from './gift-core-all-release-outputs.mjs';

const hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);

export async function inspectAllGiftOutputsWithLocalCore({rpc,binding}) {
 assert.equal(typeof rpc,'function','Read-only RPC transport required');
 assert.equal(binding?.network,'regtest','Regtest gift required');
 assert.ok(hash(binding.fundingTxid),'Valid funding transaction required');
 assert.ok(Array.isArray(binding.releaseOutputs)&&binding.releaseOutputs.length>0&&
  binding.releaseOutputs.length<=100,'Bounded gift release count required');
 const start=await rpc('getbestblockhash',[]);
 assert.ok(hash(start),'Invalid initial tip');
 const info=await rpc('getblockchaininfo',[]);
 assert.equal(info?.chain,'regtest','Regtest only');
 assert.equal(info.bestblockhash,start,'Core chain tip inconsistent');
 const transaction=await rpc('getrawtransaction',[binding.fundingTxid,true]);
 assert.equal(transaction?.txid,binding.fundingTxid,'Wrong funding transaction');
 assert.ok(hash(transaction.blockhash),'Funding transaction must be confirmed');
 const header=await rpc('getblockheader',[transaction.blockhash,true]);
 assert.equal(header?.hash,transaction.blockhash,'Funding block mismatch');
 assert.ok(Number.isSafeInteger(header.confirmations)&&header.confirmations>0,'Funding block not confirmed');
 const observations=[];
 for(const release of binding.releaseOutputs) {
  assert.ok(Number.isSafeInteger(release.vout)&&release.vout>=0,'Invalid release output index');
  observations.push(await rpc('gettxout',[binding.fundingTxid,release.vout,false]));
 }
 const end=await rpc('getbestblockhash',[]);
 assert.equal(end,start,'Chain tip changed during gift verification');
 const verified=verifyScheduledGiftCoreOutputs(binding,transaction,observations,start);
 return Object.freeze({
  ...verified,tipStableDuringRead:true,observedTip:start,
  fundingBlockConfirmed:true,
  // Transport and creator provenance are independent from data consistency.
  chainProvenanceAuthenticated:false,creatorAuthenticated:false,
  beneficiaryAuthorized:false,canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
