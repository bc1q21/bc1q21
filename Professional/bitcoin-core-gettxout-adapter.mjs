// Validate a caller-supplied Bitcoin Core gettxout result for one public outpoint.
// This adapter never makes an RPC request or asserts the node is trusted.
export function parseBitcoinCoreGettxout(txid, vout, response) {
  if (typeof txid !== 'string' || !/^[0-9a-f]{64}$/i.test(txid) ||
      !Number.isInteger(vout) || vout < 0 || vout > 0xffffffff)
    throw Error('Invalid requested outpoint');
  if (response === null) throw Error('UTXO absent or spent according to node');
  if (!response || typeof response !== 'object' || Array.isArray(response) ||
      !response.scriptPubKey || typeof response.scriptPubKey.hex !== 'string' ||
      !/^(?:[0-9a-f]{2})+$/i.test(response.scriptPubKey.hex))
    throw Error('Malformed Bitcoin Core UTXO response');
  if (typeof response.value !== 'number' || !Number.isFinite(response.value) ||
      response.value < 0 || !Number.isSafeInteger(Math.round(response.value*1e8)) ||
      Math.abs(response.value*1e8-Math.round(response.value*1e8)) > 0.00001)
    throw Error('Invalid Bitcoin Core BTC amount');
  if (!Number.isInteger(response.confirmations) || response.confirmations < 1)
    throw Error('Funding UTXO is unconfirmed');
  return Object.freeze({
    txid:txid.toLowerCase(),vout,
    valueSats:Math.round(response.value*1e8),
    scriptPubKeyHex:response.scriptPubKey.hex.toLowerCase(),
    confirmed:true,spent:false
  });
}
