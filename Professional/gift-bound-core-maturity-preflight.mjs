import assert from 'node:assert/strict';
// Read-only Professional regtest maturity inspection; never grants QR permission.
export async function inspectGiftBoundMaturityWithCore({rpc,giftEvidence,review}) {
 assert.equal(typeof rpc,'function');
 assert.equal(giftEvidence?.network,'regtest');
 assert.equal(giftEvidence?.outputsConsistent,true);
 assert.equal(giftEvidence?.tipStableDuringRead,true);
 assert.equal(review?.network,'regtest');
 assert.equal(review?.giftOutputMatched,true);
 assert.equal(review?.exactPsbtMatched,true);
 const tx=review.transactionConfirmation;
 assert.equal(tx?.signed,false);
 assert.equal(tx?.broadcast,false);
 assert.equal(tx?.fundingTxid,giftEvidence.fundingTxid);
 assert.equal(tx?.fundingVout,giftEvidence.verifiedOutputs?.[review.releaseIndex]?.vout);
 assert.equal(tx?.inputSats,giftEvidence.verifiedOutputs?.[review.releaseIndex]?.sats);
 assert.ok(Number.isSafeInteger(tx.locktime)&&tx.locktime>=0&&tx.locktime<=0xffffffff);
 const tip=await rpc('getbestblockhash',[]);
 assert.match(tip,/^[a-f0-9]{64}$/);
 assert.equal(tip,giftEvidence.observedTip,'Recollect gift evidence after tip change');
 const info=await rpc('getblockchaininfo',[]);
 assert.equal(info?.chain,'regtest');
 assert.equal(info?.bestblockhash,tip);
 const header=await rpc('getblockheader',[tip,true]);
 assert.equal(header?.hash,tip);
 assert.equal(header?.height,info.blocks);
 assert.ok(Number.isSafeInteger(header?.height)&&header.height>=0);
 assert.ok(Number.isSafeInteger(header?.mediantime)&&header.mediantime>=0);
 assert.equal(await rpc('getbestblockhash',[]),tip,'Tip changed during maturity check');
 const timestamp=tx.locktime>=500000000;
 assert.equal(tx.locktimeType,timestamp?'timestamp':'block-height');
 const mature=timestamp?header.mediantime>tx.locktime:header.height+1>tx.locktime;
 return Object.freeze({network:'regtest',observedTip:tip,releaseIndex:review.releaseIndex,
  locktime:tx.locktime,locktimeType:tx.locktimeType,cltvMatureForNextBlock:mature,
  readyForApprovalReview:mature,chainProvenanceAuthenticated:false,
  beneficiaryAuthorized:false,canExportSigningQr:false,canSign:false,canBroadcast:false});
}
