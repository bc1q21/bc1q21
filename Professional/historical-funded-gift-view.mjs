// Read-only gift-card view from historical public evidence.
// Do not infer release dates, live UTXO state, creator identity, or signing rights.
import assert from 'node:assert/strict';
import {giftLocator} from './gift-link-public-candidate.mjs';
export function viewHistoricalProfessionalGift(giftUrl,proof) {
 const locator=giftLocator(giftUrl);
 assert.equal(proof?.format,'bc1q21-professional-historical-funded-gift-public-evidence-v1');
 assert.equal(proof.network,'regtest');
 assert.equal(locator.fundingAddress,proof.giftLinkFundingAddress,'Gift link does not match funded gift locator');
 assert.match(proof.fundingTxid,/^[a-f0-9]{64}$/);
 assert.equal(proof.releaseOutputs?.length,24);
 const releases=proof.releaseOutputs.map((r,i)=>{
  assert.equal(r.index,i);assert.equal(r.vout,i+2);
  assert.ok(Number.isSafeInteger(r.sats)&&r.sats>0);
  assert.match(r.scriptPubKeyHex,/^a914[a-f0-9]{40}87$/);
  return Object.freeze({index:i,vout:r.vout,sats:r.sats,scriptPubKeyHex:r.scriptPubKeyHex,
   date:null,maturityVerified:false,confirmedUnspent:false});
 });
 return Object.freeze({format:'bc1q21-professional-historical-gift-preview-v1',
  network:'regtest',giftAddress:locator.fundingAddress,fundingTxid:proof.fundingTxid,
  releaseCount:releases.length,totalScheduledSats:releases.reduce((sum,r)=>sum+r.sats,0),
  releases:Object.freeze(releases),schedulePublished:false,chainProvenanceAuthenticated:false,
  creatorAuthenticated:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false});
}
