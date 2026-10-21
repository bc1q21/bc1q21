// bc1q21 Professional — regtest CLTV height/timestamp gate, read-only.
// Caller-supplied Core observations are not proof of trusted RPC provenance.
// Block-height CLTV uses the height of the NEXT block for consensus finality.
import assert from 'node:assert/strict';
import {inspectGiftSpecificCoreContinuity} from './gift-specific-core-continuity.mjs';
import {verifyProfessionalPublicHandoff} from './public-handoff.mjs';

export function inspectGiftSpecificCltvMaturity(url,handoff,funding,checkpoint,coreEvidence,chainTip) {
 const continuity=inspectGiftSpecificCoreContinuity(url,handoff,funding,checkpoint,coreEvidence);
 const wallet=verifyProfessionalPublicHandoff(handoff);
 assert.ok(chainTip&&typeof chainTip==='object'&&!Array.isArray(chainTip),'Chain tip evidence required');
 assert.equal(chainTip.chain,'regtest','Regtest chain required');
 assert.ok(Number.isSafeInteger(chainTip.blocks)&&chainTip.blocks>=0,'Invalid block height');
 assert.match(chainTip.bestblockhash,/^[0-9a-f]{64}$/,'Invalid best block hash');
 assert.ok(Number.isSafeInteger(wallet.locktime)&&wallet.locktime>=0&&wallet.locktime<=0xffffffff,
  'Invalid CLTV locktime');
 assert.ok(chainTip.blocks>=checkpoint.fundingBlockHeight,'Chain tip precedes funding block');
 // For a CLTV height N, a transaction with nLockTime=N and non-final input
 // is final for inclusion in the next block when nextHeight > N.
 const nextHeight=chainTip.blocks+1;
 // Bitcoin timestamp nLockTime finality uses previous-block Median Time Past,
 // not the wall clock and not the chain tip block's own timestamp.
 const timestampLock=wallet.locktime>=500000000;
 if(timestampLock)assert.ok(Number.isSafeInteger(chainTip.mediantime)&&
  chainTip.mediantime>=500000000&&chainTip.mediantime<=0xffffffff,
  'Trusted-chain candidate requires previous-block median time past');
 const matureForNextBlock=timestampLock
  ?chainTip.mediantime>wallet.locktime
  :nextHeight>wallet.locktime;
 return Object.freeze({
  network:'regtest',outpoint:continuity.fundingTxid+':'+continuity.vout,
  nextBlockHeight:nextHeight,locktimeType:timestampLock?'timestamp':'height',
  observedMedianTimePast:timestampLock?chainTip.mediantime:null,
  cltvMatureForNextBlock:matureForNextBlock,
  chainTipSourceVerified:false,authenticated:false,scheduleUnlocked:false,
  canConstructRelease:false,canSign:false,canBroadcast:false
 });
}
