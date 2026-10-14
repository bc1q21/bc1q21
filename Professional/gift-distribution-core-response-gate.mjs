// Synthetic read-only composition. Caller supplies trusted Bitcoin Core gettxout results.
// This does not connect to a node, verify signatures or authorize broadcast.
import {parseBitcoinCoreGettxout} from './bitcoin-core-gettxout-adapter.mjs';
import {checkGiftDistributionAgainstSnapshot} from './gift-distribution-snapshot-gate.mjs';

export function checkGiftDistributionWithCoreResponses(envelope, fundingInputs, coreResponses, transactionHex) {
  if (!Array.isArray(fundingInputs) || !Array.isArray(coreResponses) ||
      fundingInputs.length === 0 || fundingInputs.length !== coreResponses.length)
    throw Error('Each funding input requires one Bitcoin Core response');
  const snapshot = fundingInputs.map((input, index) =>
    parseBitcoinCoreGettxout(input.txid, input.vout, coreResponses[index]));
  return checkGiftDistributionAgainstSnapshot(envelope, fundingInputs, snapshot, transactionHex);
}
