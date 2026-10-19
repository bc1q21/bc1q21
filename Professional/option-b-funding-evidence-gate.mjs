// Professional-only Option B evidence boundary.
// A caller's public schedule, transaction or Core-like response cannot be promoted
// into trusted on-chain funding, recipient authorization, signing or live routing.
import assert from 'node:assert/strict';
import {mapProfessionalGiftLocatorToSchedule} from './option-b-explicit-link-map.mjs';

export function inspectOptionBFundingEvidence(giftUrl,published,commitment,observation) {
 const mapped=mapProfessionalGiftLocatorToSchedule(giftUrl,published,commitment);
 assert.ok(observation&&typeof observation==='object'&&!Array.isArray(observation),
  'Read-only funding observation required');
 assert.deepEqual(Object.keys(observation).sort(),
  ['fundingTxid','releaseOutputs'].sort(),'Unexpected observation fields');
 assert.match(observation.fundingTxid,/^[a-f0-9]{64}$/,'Invalid funding transaction id');
 assert.ok(Array.isArray(observation.releaseOutputs),'Release outputs required');
 assert.equal(observation.releaseOutputs.length,published.outputScriptsHex.length,
  'Observed release count differs from schedule');
 const seen=new Set();
 for(let i=0;i<observation.releaseOutputs.length;i++){
  const item=observation.releaseOutputs[i];
  assert.ok(item&&typeof item==='object'&&!Array.isArray(item));
  assert.deepEqual(Object.keys(item).sort(),['scriptPubKeyHex','vout'].sort(),
   'Unexpected release observation fields');
  assert.ok(Number.isSafeInteger(item.vout)&&item.vout>=0,'Invalid vout');
  assert.ok(!seen.has(item.vout),'Duplicate release vout');
  seen.add(item.vout);
  assert.equal(item.scriptPubKeyHex,published.outputScriptsHex[i],
   'Observed release script differs from scheduled release');
 }
 return Object.freeze({
  format:'bc1q21-professional-option-b-untrusted-funding-observation-v1',
  network:'regtest',giftLocatorAddress:mapped.giftLocatorAddress,
  fundingTxid:observation.fundingTxid,releaseCount:mapped.releaseCount,
  observedScriptsMatchSuppliedSchedule:true,
  evidenceLevel:'caller-supplied-observation-not-trusted-chain-proof',
  rpcProvenanceVerified:false,confirmed:false,unspentVerified:false,
  mappingAuthenticated:false,recipientAuthenticated:false,
  readyForLiveRouting:false,canSign:false,canBroadcast:false
 });
}
