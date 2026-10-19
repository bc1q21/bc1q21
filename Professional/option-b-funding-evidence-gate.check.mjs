import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {inspectOptionBFundingEvidence} from './option-b-funding-evidence-gate.mjs';
const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const firstDate='2031-01-15';
const h=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex:0,locktime:retailDateToCltvTimestamp(firstDate)});
const published={accountXpub,masterFingerprintHex,firstDate,interval:'month',outputScriptsHex:[h.fundingScriptPubKeyHex]};
const fundingAddress='bcrt1q'+'q'.repeat(38);
const url='https://example.invalid/gift/'+fundingAddress+'?interval=month';
const commitment={fundingAddress,releaseScriptsHex:published.outputScriptsHex};
const observation={fundingTxid:'11'.repeat(32),releaseOutputs:[{vout:0,scriptPubKeyHex:h.fundingScriptPubKeyHex}]};
test('matching untrusted funding observation never establishes confirmed unspent funds',()=>{
 const result=inspectOptionBFundingEvidence(url,published,commitment,observation);
 assert.equal(result.observedScriptsMatchSuppliedSchedule,true);
 assert.equal(result.evidenceLevel,'caller-supplied-observation-not-trusted-chain-proof');
 for(const k of ['rpcProvenanceVerified','confirmed','unspentVerified','mappingAuthenticated','recipientAuthenticated','readyForLiveRouting','canSign','canBroadcast'])
  assert.equal(result[k],false);
});
test('reject forged release script, repeated vout and unexpected status claims',()=>{
 assert.throws(()=>inspectOptionBFundingEvidence(url,published,commitment,
  {...observation,releaseOutputs:[{vout:0,scriptPubKeyHex:'a914'+'00'.repeat(20)+'87'}]}),/differs/);
 assert.throws(()=>inspectOptionBFundingEvidence(url,published,commitment,
  {...observation,confirmed:true}),/Unexpected observation fields/);
 assert.throws(()=>inspectOptionBFundingEvidence(url,published,commitment,
  {...observation,fundingTxid:'not-a-txid'}),/Invalid funding transaction id/);
});
