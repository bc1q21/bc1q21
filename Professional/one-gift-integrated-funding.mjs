// Regtest-only, one-gift integrated read-only funding evidence.
// Reuses the existing gift/serialized-tx and Core UTXO validators.
// IMPORTANT: even a consistent set of caller-provided RPC-like responses
// cannot prove authenticated Bitcoin Core provenance or authorize spending.
import assert from 'node:assert/strict';
import {bindOneGiftToRawFundingTransaction} from './one-gift-raw-funding-binding.mjs';
import {inspectOneGiftCoreUtxos} from './one-gift-core-utxo-continuity.mjs';

export function inspectIntegratedOneGiftFunding({giftUrl,published,commitment,rawFundingTxHex,chainInfo,observations}) {
 const binding=bindOneGiftToRawFundingTransaction(giftUrl,published,commitment,rawFundingTxHex);
 const continuity=inspectOneGiftCoreUtxos(binding,chainInfo,observations);
 assert.equal(continuity.fundingTxid,binding.fundingTxid,'Integrated funding txid differs');
 assert.equal(continuity.releaseCount,binding.releaseCount,'Integrated release count differs');
 for(let i=0;i<binding.releaseCount;i++){
  const a=binding.releaseOutputs[i],b=continuity.outputs[i];
  assert.equal(a.vout,b.vout,'Integrated output index differs');
  assert.equal(a.sats,b.sats,'Integrated amount differs');
  assert.equal(a.scriptPubKeyHex,b.scriptPubKeyHex,'Integrated output script differs');
 }
 return Object.freeze({
  format:'bc1q21-professional-one-gift-integrated-funding-v1',
  network:'regtest',giftLocatorAddress:binding.giftLocatorAddress,
  fundingTxid:binding.fundingTxid,releaseCount:binding.releaseCount,
  releaseOutputs:binding.releaseOutputs,
  coreResponsesConsistent:true,
  evidenceLevel:'integrated-caller-supplied-raw-transaction-and-core-like-responses-only',
  rawTransactionBound:true,rpcProvenanceVerified:false,chainVerified:false,
  fundingConfirmedAuthenticated:false,unspentAuthenticated:false,
  creatorAuthenticated:false,recipientAuthenticated:false,
  readyForLiveRouting:false,canSign:false,canBroadcast:false
 });
}
