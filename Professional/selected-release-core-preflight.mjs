// Professional isolated regtest: join an exact selected-release PSBT check to
// a fresh local Core UTXO observation and CLTV maturity check. Read-only.
// This is NOT a recipient authorization or a signing/broadcast permission.
import assert from 'node:assert/strict';
import {verifyGiftReleaseBinding,checkGiftReleaseAgainstUtxoSnapshot} from './browser-integration/verify-gift-release-binding.mjs';
import {parseBitcoinCoreGettxout} from './bitcoin-core-gettxout-adapter.mjs';

export async function inspectSelectedReleaseWithLocalCore({rpc,gift,release,approvedUnsignedBase64,expectedApprovedSha256}){
 assert.equal(typeof rpc,'function','Trusted local read-only RPC required');
 assert.equal(gift?.network,'regtest','Regtest only');
 const binding=verifyGiftReleaseBinding({gift,release,approvedUnsignedBase64,expectedApprovedSha256});
 const tip=await rpc('getbestblockhash',[]);
 assert.match(tip,/^[a-f0-9]{64}$/,'Valid chain tip required');
 const chain=await rpc('getblockchaininfo',[]);
 assert.equal(chain?.chain,'regtest','Regtest Core required');
 assert.equal(chain.bestblockhash,tip,'Core tip mismatch');
 const utxoResponse=await rpc('gettxout',[release.fundingTxid,release.fundingVout,false]);
 assert.equal(utxoResponse?.bestblock,tip,'UTXO observation must match chain tip');
 const utxo=parseBitcoinCoreGettxout(release.fundingTxid,release.fundingVout,utxoResponse);
 const snapshot=checkGiftReleaseAgainstUtxoSnapshot({binding,release,snapshot:utxo});
 const header=await rpc('getblockheader',[tip,true]);
 assert.equal(header?.hash,tip,'Core header tip mismatch');
 assert.equal(header?.height,chain.blocks,'Core height mismatch');
 assert.ok(Number.isSafeInteger(header.height)&&header.height>=0,'Invalid block height');
 assert.ok(Number.isSafeInteger(header.mediantime)&&header.mediantime>=0,'Invalid median time');
 const mature=release.lockHeight>=500000000?header.mediantime>release.lockHeight:
  header.height+1>release.lockHeight;
 assert.equal(await rpc('getbestblockhash',[]),tip,'Tip changed during release preflight');
 return Object.freeze({network:'regtest',observedTip:tip,
  transactionMatchesSuppliedRelease:binding.transactionMatchesSuppliedRelease,
  utxoSnapshotMatchesSelectedRelease:snapshot.utxoSnapshotMatchesSelectedRelease,
  cltvMatureForNextBlock:mature,readyForReview:mature,
  rpcTransportAuthenticated:false,creatorAuthenticated:false,
  beneficiaryAuthorized:false,canExportSigningQr:false,canSign:false,canBroadcast:false});
}
