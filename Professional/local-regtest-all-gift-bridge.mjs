// Professional-only Node.js bridge. Authenticate locally to a regtest Core
// RPC endpoint, then inspect all scheduled gift UTXOs at a stable chain tip.
// Authentication credentials must be supplied by a trusted local process,
// never a browser, gift link, QR, GitHub, or a committed configuration file.
import {createRegtestReadOnlyRpc} from './local-regtest-readonly-transport.mjs';
import {inspectAllGiftOutputsWithLocalCore} from './local-regtest-all-gift-outputs.mjs';

export async function inspectAllGiftOutputsViaLocalRegtest({
  authorization,port,binding
}) {
 const rpc=createRegtestReadOnlyRpc({authorization,port});
 const result=await inspectAllGiftOutputsWithLocalCore({rpc,binding});
 return Object.freeze({
  ...result,
  rpcTransportAuthenticated:true,
  rpcTransportScope:'credentialed-loopback-only',
  // Core transport credentials prove access to this endpoint, not independent
  // creator identity, recipient intent, or Bitcoin consensus provenance.
  chainProvenanceAuthenticated:false,
  creatorAuthenticated:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
