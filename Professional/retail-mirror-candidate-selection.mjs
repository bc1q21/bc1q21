// Professional-only public candidate selection modeled on retail's address discovery.
// This verifies chain-observed scripts, not creator identity or Jade key ownership.
// No fingerprint, mnemonic, signing, broadcasting or network calls here.
import assert from 'node:assert/strict';
import {verifyPublicRetailSchedule} from './public-retail-schedule-verify.mjs';

export function selectRetailMirrorGiftCandidate({locator,transactions,published,coreTransactions}) {
 assert.ok(typeof locator?.fundingAddress==='string','Gift locator required');
 assert.ok(Array.isArray(transactions)&&transactions.length<=10000,'Bounded address transaction list required');
 const candidates=[];
 for(const tx of transactions) {
  if(!/^[a-f0-9]{64}$/.test(tx?.txid??'')||!Array.isArray(tx.vout))continue;
  if(!tx.vout.some(o=>o?.scriptpubkey_type==='op_return'))continue;
  const outputs=tx.vout.filter(o=>Number.isSafeInteger(o?.n)&&o.n>=0&&
   Number.isSafeInteger(o?.value)&&o.value>0&&
   /^(?:[a-f0-9]{2})+$/.test(o?.scriptpubkey??''))
   .map(o=>({vout:o.n,sats:o.value,scriptPubKey:o.scriptpubkey}));
  if(outputs.length)candidates.push({txid:tx.txid,outputs});
 }
 const discovery={candidates,candidateCount:candidates.length};
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
