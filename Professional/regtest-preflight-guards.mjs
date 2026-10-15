// Professional isolated regtest preflight: pure validation, no network or disk writes.
// The caller must independently verify its Bitcoin Core connection is local and disposable.
export function validateChainInfo(info) {
  if (!info || info.chain !== 'regtest') throw new Error('Refusing non-regtest chain');
  if (!Number.isSafeInteger(info.blocks) || info.blocks < 0) throw new Error('Invalid block height');
  return {chain: 'regtest', blocks: info.blocks};
}
export function validateRegtestDestination(config) {
  if (!config || config.network !== 'regtest' || config.disposable !== true ||
      config.rpcHost !== '127.0.0.1' || config.allowPublicBroadcast !== false) {
    throw new Error('Isolated local regtest configuration required');
  }
  return true;
}
