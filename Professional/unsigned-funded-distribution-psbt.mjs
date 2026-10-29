// bc1q21 Professional — construct a disposable regtest creator PSBT from a
// validated funded distribution intent and Jade-derived PUBLIC signer data.
// No seed, WIF, signing, wallet communication, or broadcast.
import bitcoin from 'bitcoinjs-lib';
import {sha256} from '@noble/hashes/sha256';
import {Buffer} from 'buffer';

const fail = message => { throw Error('Professional unsigned distribution: ' + message); };
const bytes = hex => Buffer.from(hex, 'hex');
const isHex = (s, n) => typeof s === 'string' &&
  new RegExp('^[a-fA-F0-9]{' + (n * 2) + '}$').test(s);
const validScript = s => typeof s === 'string' && s.length >= 4 &&
  s.length <= 20000 && s.length % 2 === 0 && /^[0-9a-f]+$/i.test(s);

export function buildUnsignedFundedDistributionPsbt(intent, signer) {
  if (intent?.format !== 'bc1q21-professional-funded-distribution-intent-v1' ||
      intent.network !== 'regtest' || intent.signed !== false ||
      intent.signatureVerified !== false || intent.broadcastAuthorized !== false)
    fail('Validated unsigned regtest intent required');
  if (!Array.isArray(intent.inputs) || !intent.inputs.length ||
      !Array.isArray(intent.gifts) || !intent.gifts.length)
    fail('Funding inputs and gift outputs required');
  if (!isHex(signer?.masterFingerprintHex, 4) ||
      !isHex(signer?.publicKeyHex, 33) ||
      typeof signer.path !== 'string' ||
      !/^m\/[0-9]+'\/[0-9]+'\/[0-9]+'\/[01]\/[0-9]+$/.test(signer.path))
    fail('Valid Jade public signing identity and derivation path required');
  const pubkey = bytes(signer.publicKeyHex);
  if (pubkey[0] !== 2 && pubkey[0] !== 3) fail('Compressed signer public key required');
  const network = bitcoin.networks.regtest;
  const expectedFundingScript = bitcoin.payments.p2wpkh({pubkey, network}).output;
  if (!expectedFundingScript) fail('Invalid signer public key');
  const psbt = new bitcoin.Psbt({network});
  const seen = new Set();
  for (const input of intent.inputs) {
    if (!isHex(input.txid, 32) || !Number.isSafeInteger(input.vout) ||
        input.vout < 0 || !Number.isSafeInteger(input.valueSats) ||
        input.valueSats <= 0 || !validScript(input.scriptPubKeyHex))
      fail('Invalid funding input');
    const outpoint = input.txid + ':' + input.vout;
    if (seen.has(outpoint)) fail('Duplicate funding input');
    seen.add(outpoint);
    if (!expectedFundingScript.equals(bytes(input.scriptPubKeyHex)))
      fail('Funding input does not belong to the Jade public signing key');
    psbt.addInput({
      hash: input.txid, index: input.vout,
      witnessUtxo: {script: expectedFundingScript, value: input.valueSats},
      bip32Derivation: [{
        masterFingerprint: bytes(signer.masterFingerprintHex),
        path: signer.path, pubkey
      }]
    });
  }
  const outputs = [
    ...intent.gifts.map(g => ({scriptPubKeyHex:g.scriptPubKeyHex,valueSats:g.valueSats})),
    ...(intent.serviceFee ? [intent.serviceFee] : []),
    ...(intent.change ? [intent.change] : [])
  ];
  for (const output of outputs) {
    if (!validScript(output.scriptPubKeyHex) ||
        !Number.isSafeInteger(output.valueSats) || output.valueSats <= 0)
      fail('Invalid transaction output');
    psbt.addOutput({script: bytes(output.scriptPubKeyHex), value: output.valueSats});
  }
  const totalIn = intent.inputs.reduce((n, i) => n + i.valueSats, 0);
  const totalOut = outputs.reduce((n, o) => n + o.valueSats, 0);
  if (!Number.isSafeInteger(totalIn) || !Number.isSafeInteger(totalOut) ||
      totalIn - totalOut !== intent.networkFeeSats)
    fail('Funding amounts or fee changed');
  const raw = psbt.toBuffer();
  const unsignedTx = psbt.data.globalMap.unsignedTx.toBuffer();
  if (psbt.data.inputs.some(i => i.partialSig?.length || i.finalScriptSig ||
      i.finalScriptWitness || i.tapKeySig))
    fail('Signed input prohibited');
  return Object.freeze({
    format:'bc1q21-professional-funded-distribution-unsigned-psbt-v1',
    network:'regtest', unsignedPsbtBase64:raw.toString('base64'),
    psbtSha256:Buffer.from(sha256(raw)).toString('hex'),
    unsignedTxSha256:Buffer.from(sha256(unsignedTx)).toString('hex'),
    fundingInputCount:intent.inputs.length, giftOutputCount:intent.gifts.length,
    totalOutputCount:outputs.length, networkFeeSats:intent.networkFeeSats,
    nextEncoder:'ur:crypto-psbt', signed:false, broadcast:false,
    hardwareSignatureVerified:false
  });
}
