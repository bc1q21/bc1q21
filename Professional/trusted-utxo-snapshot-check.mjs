// Read-only public UTXO reconciliation against a caller-supplied trusted snapshot.
// No network access or chain-validity claim. Snapshot provenance is the caller's responsibility.
export function reconcileTrustedUtxoSnapshot(requestedInputs, snapshot) {
  if (!Array.isArray(requestedInputs) || requestedInputs.length === 0 ||
      !Array.isArray(snapshot) || snapshot.length === 0)
    throw Error('Funding inputs and trusted snapshot required');
  const key = u => {
    if (!u || typeof u.txid !== 'string' || !/^[0-9a-f]{64}$/i.test(u.txid) ||
        !Number.isInteger(u.vout) || u.vout < 0 || u.vout > 0xffffffff)
      throw Error('Malformed public outpoint');
    return u.txid.toLowerCase()+':'+u.vout;
  };
  const byOutpoint = new Map();
  for (const u of snapshot) {
    const k=key(u);
    if (byOutpoint.has(k)) throw Error('Duplicate snapshot outpoint');
    if (!Number.isSafeInteger(u.valueSats) || u.valueSats <= 0 ||
        typeof u.scriptPubKeyHex !== 'string' ||
        !/^(?:[0-9a-f]{2})+$/i.test(u.scriptPubKeyHex))
      throw Error('Malformed snapshot amount or script');
    byOutpoint.set(k,u);
  }
  const seen=new Set();
  for (const input of requestedInputs) {
    const k=key(input);
    if (seen.has(k)) throw Error('Duplicate requested outpoint');
    seen.add(k);
    const u=byOutpoint.get(k);
    if (!u) throw Error('Funding outpoint absent from trusted snapshot');
    if (u.spent !== false || u.confirmed !== true)
      throw Error('Funding outpoint not confirmed unspent in snapshot');
    if (input.valueSats !== u.valueSats ||
        typeof input.scriptPubKeyHex !== 'string' ||
        input.scriptPubKeyHex.toLowerCase() !== u.scriptPubKeyHex.toLowerCase())
      throw Error('Funding amount or script differs from snapshot');
  }
  return Object.freeze({matchedCount:seen.size,publicInputsMatch:true,
    snapshotSourceVerified:false,chainVerified:false,broadcast:false});
}
