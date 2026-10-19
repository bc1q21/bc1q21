// Professional isolated read-only regtest outpoint gate.
// Caller-provided Bitcoin Core response is not proof of trusted RPC provenance.
import assert from 'node:assert/strict';
import {parseBitcoinCoreGettxout} from './bitcoin-core-gettxout-adapter.mjs';
import {verifyGiftSpecificFundingBinding} from './gift-specific-funding-binding.mjs';
import {verifyProfessionalPublicHandoff} from './public-handoff.mjs';

export function inspectGiftSpecificCoreUtxo(url, handoff, funding, gettxoutResponse) {
  const bound=verifyGiftSpecificFundingBinding(url,handoff,funding);
  const wallet=verifyProfessionalPublicHandoff(handoff);
  const utxo=parseBitcoinCoreGettxout(funding.expectedTxid,funding.vout,gettxoutResponse);
  assert.equal(utxo.valueSats,funding.expectedSats,'Bitcoin Core UTXO amount differs');
  assert.equal(utxo.scriptPubKeyHex,wallet.fundingScriptPubKeyHex.toLowerCase(),'Bitcoin Core UTXO script differs');
  return Object.freeze({
    network:'regtest',outpoint:utxo.txid+':'+utxo.vout,
    valueSats:utxo.valueSats,confirmed:utxo.confirmed,spent:utxo.spent,
    responseMatchesFunding:true,
    rpcProvenanceVerified:false,chainVerified:false,
    authenticated:false,scheduleUnlocked:false,canSign:false,canBroadcast:false
  });
}
