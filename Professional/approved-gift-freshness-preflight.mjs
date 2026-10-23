// Professional-only pre-export guard: fresh read-only Core inspection of the
// exact approved gift outpoint. It never exports QR data or grants signing.
// A new chain tip invalidates the approval and requires full gift re-review.
import assert from 'node:assert/strict';

export async function inspectFreshApprovedGiftOutpoint({rpc,giftEvidence,approvalReceipt,releaseIndex}) {
 assert.equal(typeof rpc,'function','Read-only Core transport required');
 assert.equal(giftEvidence?.network,'regtest','Regtest gift required');
 assert.equal(giftEvidence?.outputsConsistent,true,'Verified gift outputs required');
 assert.equal(giftEvidence?.tipStableDuringRead,true,'Stable gift evidence required');
 assert.equal(approvalReceipt?.network,'regtest','Regtest approval required');
 assert.equal(approvalReceipt?.approvalRecorded,true,'Explicit approval receipt required');
 assert.equal(approvalReceipt?.releaseIndex,releaseIndex,'Approval belongs to another release');
 assert.equal(approvalReceipt?.observedTip,giftEvidence.observedTip,'Approval chain tip mismatch');
 assert.match(approvalReceipt?.psbtSha256??'',/^[a-f0-9]{64}$/,'Exact PSBT fingerprint required');
 const output=giftEvidence.verifiedOutputs?.[releaseIndex];
 assert.ok(output&&output.index===releaseIndex&&output.txid===giftEvidence.fundingTxid,
  'Approved release not in verified gift');
 assert.ok(giftEvidence.verifiedOutputs.length===giftEvidence.releaseCount&&
  giftEvidence.releaseCount>0,'Complete verified gift release set required');
 const start=await rpc('getbestblockhash',[]);
 assert.equal(start,approvalReceipt.observedTip,'Chain tip changed since approval; re-review required');
 const chain=await rpc('getblockchaininfo',[]);
 assert.equal(chain?.chain,'regtest','Regtest only');
 assert.equal(chain?.bestblockhash,start,'Inconsistent chain tip');
 const utxo=await rpc('gettxout',[output.txid,output.vout,false]);
 assert.ok(utxo&&utxo.bestblock===start,'Approved gift output spent or tip changed');
 assert.ok(Number.isSafeInteger(utxo.confirmations)&&utxo.confirmations>0,'Unconfirmed gift output');
 assert.equal(utxo.value*100000000,output.sats,'Approved gift amount changed');
 assert.match(output.scriptPubKeyHex??'',/^(?:[a-f0-9]{2})+$/,'Verified gift output script required');
 assert.equal(utxo.scriptPubKey?.hex,output.scriptPubKeyHex,'Approved gift locking script changed');
 const end=await rpc('getbestblockhash',[]);
 assert.equal(end,start,'Chain tip changed during recheck');
 return Object.freeze({
  network:'regtest',releaseIndex,txid:output.txid,vout:output.vout,
  psbtSha256:approvalReceipt.psbtSha256,observedTip:start,
  freshOutpointMatched:true,approvalStillTipBound:true,
  chainProvenanceAuthenticated:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
