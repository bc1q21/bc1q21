// Professional-only, read-only regtest Core response consistency.
// Inputs are caller-supplied: never assert authenticated RPC provenance.
import assert from 'node:assert/strict';
import {parseBitcoinCoreGettxout} from './bitcoin-core-gettxout-adapter.mjs';

export function inspectOneGiftCoreUtxos(binding,chainInfo,observations) {
 assert.ok(binding&&binding.format==='bc1q21-professional-one-gift-raw-funding-binding-v1'&&binding.network==='regtest', 'Regtest raw funding binding required');
 assert.match(binding.fundingTxid,/^[0-9a-f]{64}$/,'Invalid funding txid');
 assert.ok(Array.isArray(binding.releaseOutputs)&&binding.releaseOutputs.length>0,'Missing release outputs');
 assert.ok(chainInfo&&chainInfo.chain==='regtest'&&Number.isSafeInteger(chainInfo.blocks)&&chainInfo.blocks>=0,'Regtest chain info required');
 assert.match(chainInfo.bestblockhash,/^[0-9a-f]{64}$/,'Invalid chain tip');
 assert.ok(Array.isArray(observations)&&observations.length===binding.releaseOutputs.length,'One Core gettxout response required per release');
 const seen=new Set();
 const outputs=binding.releaseOutputs.map((expected,i)=>{
  assert.ok(Number.isSafeInteger(expected.vout)&&expected.vout>=0&&!seen.has(expected.vout),'Invalid or repeated vout');
  seen.add(expected.vout);
  assert.ok(Number.isSafeInteger(expected.sats)&&expected.sats>0,'Invalid release amount');
  assert.match(expected.scriptPubKeyHex,/^(?:[0-9a-f]{2})+$/,'Invalid release script');
  const item=observations[i];
  assert.ok(item&&typeof item==='object'&&!Array.isArray(item),'Missing Core observation');
  assert.deepEqual(Object.keys(item).sort(),['txid','vout','response'],'Unexpected observation fields');
  assert.equal(item.txid,binding.fundingTxid,'Observed transaction differs');
  assert.equal(item.vout,expected.vout,'Observed output index differs');
  const parsed=parseBitcoinCoreGettxout(item.txid,item.vout,item.response);
  assert.equal(parsed.valueSats,expected.sats,'Observed amount differs');
  assert.equal(parsed.scriptPubKeyHex,expected.scriptPubKeyHex,'Observed script differs');
  assert.equal(item.response.bestblock,chainInfo.bestblockhash,'Core observation and chain tip differ');
  return Object.freeze({vout:expected.vout,sats:expected.sats,scriptPubKeyHex:expected.scriptPubKeyHex,reportedConfirmations:item.response.confirmations});
 });
 return Object.freeze({format:'bc1q21-professional-one-gift-core-consistency-v1',network:'regtest',fundingTxid:binding.fundingTxid,releaseCount:outputs.length,outputs:Object.freeze(outputs),coreResponsesConsistent:true,evidenceLevel:'caller-supplied-core-like-responses-only',rpcProvenanceVerified:false,chainVerified:false,authenticated:false,recipientAuthenticated:false,readyForLiveRouting:false,canSign:false,canBroadcast:false});
}
