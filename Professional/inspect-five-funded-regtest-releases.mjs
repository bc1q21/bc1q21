// Independent read-only Bitcoin Core regtest inspection for all funded
// Professional recipient releases. This does NOT authenticate a customer,
// authorize hardware signing, or make a recipient browser trust arbitrary JSON.
import assert from 'node:assert/strict';
import {createRegtestReadOnlyRpc} from './local-regtest-readonly-transport.mjs';
import {collectProfessionalCoreSnapshot} from './core-readonly-snapshot.mjs';
import {verifyGiftReleaseBinding} from './browser-integration/verify-gift-release-binding.mjs';
import {selectPublicGiftRelease} from './browser-integration/select-public-gift-release.mjs';

const fail=message=>{throw Error('Professional read-only release inspection: '+message)};
const toSats=btc=>{
 if(typeof btc!=='number'||!Number.isFinite(btc))fail('Invalid Core BTC amount');
 const sats=Math.round(btc*100000000);
 if(!Number.isSafeInteger(sats)||Math.abs(btc*100000000-sats)>0.00001)
  fail('Imprecise Core BTC amount');
 return sats;
};
// BIP65/BIP113: a height lock is satisfied when the next block height is
// strictly greater than nLockTime; timestamp locks use the prior block's
// median-time-past, also strictly greater than nLockTime.
export function evaluateProfessionalCltvMaturity({locktime,tipHeight,medianTimePast}){
 if(!Number.isSafeInteger(locktime)||locktime<0||locktime>0xffffffff||
    !Number.isSafeInteger(tipHeight)||tipHeight<0||
    !Number.isSafeInteger(medianTimePast)||medianTimePast<0)
  fail('Invalid locktime or verified chain tip');
 const timestampLock=locktime>=500000000;
 return Object.freeze({
  locktime,lockType:timestampLock?'timestamp':'height',
  nextBlockHeight:tipHeight+1,medianTimePast,
  maturedForNextBlock:timestampLock
   ?medianTimePast>locktime
   :tipHeight+1>locktime
 });
}
export async function inspectFiveFundedRegtestReleases({gift,psbts,rpc}){
 if(typeof rpc!=='function')fail('Authenticated local read-only Core RPC required');
 if(!gift||!Array.isArray(gift.releases)||!Array.isArray(psbts)||
  gift.releases.length!==5||psbts.length!==5)fail('Exactly five releases required');
 const checks=[];
 let commonTip=null;
 const evidenceNumbers=new Set();
 for(const item of psbts){
  if(!Number.isSafeInteger(item?.releaseNumber)||item.releaseNumber<1||item.releaseNumber>5||
     evidenceNumbers.has(item.releaseNumber))fail('Duplicate or invalid release PSBT number');
  evidenceNumbers.add(item.releaseNumber);
 }
 for(let i=1;i<=5;i++){
  const release=selectPublicGiftRelease({
   gift,recipientLocator:gift.fundingAddress,releaseNumber:i});
  const record=gift.releases.find(x=>x.releaseNumber===i);
  const evidence=psbts.find(x=>x.releaseNumber===i);
  if(!evidence)fail('Missing release PSBT '+i);
  const binding=verifyGiftReleaseBinding({
   gift,release:record,approvedUnsignedBase64:evidence.approvedUnsignedBase64,
   expectedApprovedSha256:evidence.expectedApprovedSha256});
  assert.equal(binding.transactionMatchesSuppliedRelease,true);
  const snapshot=await collectProfessionalCoreSnapshot({
   rpc,txid:release.fundingTxid,vout:release.fundingVout});
  if(commonTip===null)commonTip=snapshot.chainTip.bestblockhash;
  if(snapshot.chainTip.bestblockhash!==commonTip)
   fail('Bitcoin Core chain tip changed between release checks; retry entire inspection');
  const txout=snapshot.coreEvidence.txout;
  if(toSats(txout.value)!==record.inputSats||
    txout.scriptPubKey?.hex!==record.fundingScriptHex)
   fail('Core UTXO value or locking script differs from release '+i);
  if(snapshot.coreEvidence.transaction.vout?.[record.fundingVout]?.scriptPubKey?.hex!==
    record.fundingScriptHex)fail('Confirmed transaction output script mismatch '+i);
  if(!Number.isSafeInteger(txout.confirmations)||txout.confirmations<1)
   fail('Release funding not confirmed '+i);
  const tip=snapshot.chainTip;
  // BIP65/BIP113 maturity is evaluated against the next block height or\n  // the verified tip median-time-past, never against the local wall clock.
  const maturity=evaluateProfessionalCltvMaturity({
   locktime:record.lockHeight,tipHeight:tip.blocks,
   medianTimePast:tip.mediantime
  });
  const {nextBlockHeight,maturedForNextBlock}=maturity;
  checks.push(Object.freeze({
   releaseNumber:i,txid:release.fundingTxid,vout:release.fundingVout,
   fundedConfirmedUnspent:true,coreUtxoMatches:true,
   confirmations:txout.confirmations,locktime:record.lockHeight,
   nextBlockHeight,medianTimePast:tip.mediantime,
   lockType:maturity.lockType,maturedForNextBlock,
   signingAuthorized:false,canBroadcast:false
  }));
 }
 // A reorganization after the fifth UTXO read invalidates the whole batch.
 // Fail closed instead of presenting an apparently consistent stale result.
 const finalTip=await rpc('getbestblockhash',[]);
 if(finalTip!==commonTip)
  fail('Bitcoin Core chain tip changed after release checks; retry entire inspection');
 return Object.freeze({
  format:'bc1q21-professional-five-release-core-inspection-v1',
  network:'regtest',rpcTransportScope:'caller-supplied-readonly-regtest',
  allFiveConfirmedUnspent:true,consistentChainTip:commonTip,
  customerIdentityAuthenticated:false,
  beneficiaryAuthorized:false,signingAuthorized:false,canBroadcast:false,
  releases:Object.freeze(checks)
 });
}
export function createLocalProfessionalRegtestInspector({port=18443,authorization}={}){
 return createRegtestReadOnlyRpc({port,authorization});
}
