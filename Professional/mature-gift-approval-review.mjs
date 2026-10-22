// Professional-only: gate the existing one-time exact-PSBT approval session
// behind gift binding and a mature, same-tip Core observation. This object
// intentionally does not expose a QR handoff or any signing capability.
import assert from 'node:assert/strict';
import {createConfirmationSession} from './confirmation-session.mjs';

export function createMatureGiftApprovalReview({giftReview,maturity}) {
 assert.equal(giftReview?.network,'regtest','Regtest gift review required');
 assert.equal(giftReview?.giftOutputMatched,true,'Verified gift output required');
 assert.equal(giftReview?.exactPsbtMatched,true,'Exact PSBT confirmation required');
 assert.equal(maturity?.network,'regtest','Regtest maturity evidence required');
 assert.equal(maturity?.releaseIndex,giftReview.releaseIndex,'Maturity for wrong release');
 assert.equal(maturity?.cltvMatureForNextBlock,true,'Release is not mature');
 assert.equal(maturity?.readyForApprovalReview,true,'Maturity preflight not ready');
 assert.equal(maturity?.canExportSigningQr,false,'Maturity must not grant QR permission');
 const record=giftReview.transactionConfirmation;
 assert.ok(record&&record.network==='regtest'&&record.signed===false&&record.broadcast===false,
  'Unsigned transaction confirmation required');
 assert.equal(maturity.locktime,record.locktime,'Timelock changed after review');
 assert.equal(maturity.locktimeType,record.locktimeType,'Timelock type changed after review');
 const session=createConfirmationSession(record);
 return Object.freeze({
  view:()=>Object.freeze({...session.view(),giftOutputMatched:true,
   matureForNextBlock:true,qrExportAuthorized:false}),
  approve:confirmation=>session.approve(confirmation),
  revoke:()=>session.invalidate(),
  // Explicit approval records intent, but cannot authorize QR export here.
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
