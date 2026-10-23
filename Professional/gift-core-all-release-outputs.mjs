// Professional-only: verify all scheduled gift outputs against one confirmed
// Core transaction and a stable unspent snapshot. No signing authorization.
import assert from 'node:assert/strict';

const hex64 = x => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
const satoshis = value => {
 assert.ok(typeof value === 'number' && Number.isFinite(value) && value > 0, 'Invalid BTC amount');
 const scaled = value * 100000000;
 const rounded = Math.round(scaled);
 assert.ok(Number.isSafeInteger(rounded) && Math.abs(scaled-rounded) < 0.00001, 'Non-satoshi amount');
 return rounded;
};

export function verifyScheduledGiftCoreOutputs(binding, coreTransaction, observedOutputs, bestBlockHash) {
 assert.equal(binding?.network, 'regtest', 'Regtest gift required');
 assert.ok(hex64(binding.fundingTxid) && hex64(bestBlockHash), 'Valid transaction and tip hashes required');
 assert.equal(coreTransaction?.txid, binding.fundingTxid, 'Core transaction does not match gift');
 assert.ok(hex64(coreTransaction?.blockhash), 'Confirmed funding transaction required');
 assert.ok(Array.isArray(coreTransaction.vout), 'Core funding outputs required');
 assert.ok(Array.isArray(binding.releaseOutputs) && binding.releaseOutputs.length > 0, 'Gift releases required');
 assert.equal(observedOutputs?.length, binding.releaseOutputs.length, 'One UTXO observation per release required');
 const seen = new Set();
 const verified = binding.releaseOutputs.map((release, index) => {
  assert.equal(release.index, index, 'Release order mismatch');
  assert.ok(Number.isSafeInteger(release.vout) && release.vout >= 0 && !seen.has(release.vout), 'Invalid or duplicate outpoint');
  seen.add(release.vout);
  const txOutput = coreTransaction.vout[release.vout];
  const utxo = observedOutputs[index];
  assert.equal(txOutput?.n, release.vout, 'Wrong transaction output');
  assert.equal(txOutput?.scriptPubKey?.hex, release.scriptPubKeyHex, 'Gift output script mismatch');
  assert.equal(satoshis(txOutput.value), release.sats, 'Gift output amount mismatch');
  assert.ok(utxo && Number.isSafeInteger(utxo.confirmations) && utxo.confirmations > 0, 'Gift output spent or unconfirmed');
  assert.equal(utxo.bestblock, bestBlockHash, 'UTXO observed at wrong chain tip');
  assert.equal(utxo.scriptPubKey?.hex, release.scriptPubKeyHex, 'Unspent script mismatch');
  assert.equal(satoshis(utxo.value), release.sats, 'Unspent amount mismatch');
  return Object.freeze({index,txid:binding.fundingTxid,vout:release.vout,sats:release.sats,scriptPubKeyHex:release.scriptPubKeyHex});
 });
 return Object.freeze({
  network:'regtest',fundingTxid:binding.fundingTxid,
  releaseCount:verified.length,verifiedOutputs:Object.freeze(verified),
  outputsConsistent:true,
  creatorAuthenticated:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
