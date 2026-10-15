// bc1q21 Professional isolated regtest-only consensus response guard.
// Pure validation only. No RPC calls, mining, wallet operations or broadcasting.
import {validateChainInfo,validateRegtestDestination} from './regtest-preflight-guards.mjs';

export function validateConsensusPreflight({chainInfo, destination}) {
  const chain=validateChainInfo(chainInfo);
  validateRegtestDestination(destination);
  return {chain:chain.chain,blocks:chain.blocks,publicBroadcast:false};
}

export function requireMempoolAcceptance(response,expectedTxid) {
  if (!Array.isArray(response) || response.length!==1 || !response[0] || typeof response[0]!=='object')
    throw new Error('Expected exactly one Bitcoin Core testmempoolaccept result');
  if (typeof expectedTxid!=='string' || !/^[0-9a-f]{64}$/.test(expectedTxid))
    throw new Error('Expected a canonical 64-character lowercase transaction ID');
  const result=response[0];
  if (result.txid!==expectedTxid) throw new Error('Bitcoin Core result txid mismatch');
  if (result.allowed!==true) throw new Error('Bitcoin Core did not accept transaction: '+String(result['reject-reason']??'unknown reason'));
  if (result['reject-reason']!==undefined) throw new Error('Unexpected reject-reason in accepted result');
  return {txid:expectedTxid,acceptedByRegtestMempool:true,confirmedInBlock:false};
}
