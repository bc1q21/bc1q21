// Professional-only public candidate selection modeled on retail's address discovery.
// This verifies chain-observed scripts, not creator identity or Jade key ownership.
// No fingerprint, mnemonic, signing, broadcasting or network calls here.
import assert from 'node:assert/strict';
import {inspectCandidates} from './gift-link-public-candidate.mjs';
import {verifyPublicRetailSchedule} from './public-retail-schedule-verify.mjs';

export function selectRetailMirrorGiftCandidate({locator,transactions,published,coreTransactions}) {
 const discovery=inspectCandidates(locator,transactions);
 const schedule=verifyPublicRetailSchedule(published);
 assert.ok(Array.isArray(coreTransactions),'Independently observed Core transactions required');
 const coreById=new Map();
 for(const tx of coreTransactions) {
  assert.match(tx?.txid??'',/^[a-f0-9]{64}$/,'Invalid Core transaction ID');
  assert.ok(!coreById.has(tx.txid),'Duplicate Core transaction evidence');
  coreById.set(tx.txid,tx);
 }
 const matches=[];
 for(const candidate of discovery.candidates) {
  const core=coreById.get(candidate.txid);
  if(!core||!Array.isArray(core.vout)||!core.blockhash)continue;
  if(candidate.outputs.length!==schedule.releaseCount)continue;
  const used=new Set();
  const outputs=[];
  for(const release of schedule.releases) {
   const matching=candidate.outputs.filter(o=>o.scriptPubKey===release.fundingScriptPubKeyHex);
   if(matching.length!==1)break;
   const o=matching[0],v=core.vout[o.vout];
   if(used.has(o.vout)||!v||v.n!==o.vout||
      v.scriptPubKey?.hex!==release.fundingScriptPubKeyHex||
      Math.round(v.value*1e8)!==o.sats)break;
   used.add(o.vout);
   outputs.push(Object.freeze({index:release.index,vout:o.vout,sats:o.sats,
    scriptPubKeyHex:release.fundingScriptPubKeyHex}));
  }
  if(outputs.length===schedule.releaseCount)matches.push(Object.freeze({
   network:'regtest',fundingTxid:candidate.txid,releaseOutputs:Object.freeze(outputs)
  }));
 }
 assert.equal(matches.length,1,
  matches.length===0?'No unique Core-confirmed candidate matches the public release scripts':
  'Ambiguous Core-confirmed gift candidates; refusing to select by transaction ordering');
 return Object.freeze({binding:matches[0],schedule,
  candidateCount:discovery.candidateCount,matchedCount:1,
  chainScriptsMatched:true,creatorAuthenticated:false,
  hardwareWalletOwnershipProven:false,recipientAuthorized:false,
  canSign:false,canBroadcast:false});
}
