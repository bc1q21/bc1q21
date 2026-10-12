// Independent, narrowly scoped P2SH/CLTV script validation for synthetic fixture.
// Checks the actual finalized scriptSig and all operations in the known redeemScript
// template. This is NOT a full Bitcoin Core consensus/script interpreter.
import bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'buffer';
import { secp256k1 } from '@noble/curves/secp256k1';
import { createHash } from 'node:crypto';

const sha = bytes => createHash('sha256').update(bytes).digest();
const hash160 = bytes => createHash('ripemd160').update(sha(bytes)).digest();

export function independentlyValidateSyntheticCltv(rawTxHex, fundingTxHex, expectedPubkeyHex) {
  const tx = bitcoin.Transaction.fromHex(rawTxHex);
  const funding = bitcoin.Transaction.fromHex(fundingTxHex);
  if (tx.ins.length !== 1 || tx.outs.length !== 1 || tx.ins[0].witness.length !== 0)
    throw Error('Unexpected transaction shape');
  const input = tx.ins[0];
  if (!Buffer.from(input.hash).equals(Buffer.from(funding.getHash())) ||
      input.index >= funding.outs.length) throw Error('Funding outpoint mismatch');
  const chunks = bitcoin.script.decompile(input.script);
  if (!chunks || chunks.length !== 2 || !Buffer.isBuffer(chunks[0]) || !Buffer.isBuffer(chunks[1]))
    throw Error('Invalid P2SH scriptSig push structure');
  const [signature, redeem] = chunks.map(x => Buffer.from(x));
  const pubkey = Buffer.from(expectedPubkeyHex, 'hex');
  const expectedRedeem = Buffer.concat([Buffer.from([1,110,0xb1,0x75,33]), pubkey, Buffer.from([0xac])]);
  if (!redeem.equals(expectedRedeem)) throw Error('Unexpected CLTV redeemScript');
  const expectedOutput = Buffer.concat([Buffer.from([0xa9,20]), hash160(redeem), Buffer.from([0x87])]);
  if (!Buffer.from(funding.outs[input.index].script).equals(expectedOutput))
    throw Error('P2SH HASH160 check failed');
  if (tx.locktime < 110 || tx.locktime >= 500000000 || input.sequence === 0xffffffff)
    throw Error('OP_CHECKLOCKTIMEVERIFY conditions failed');
  const decoded = bitcoin.script.signature.decode(signature);
  if (decoded.hashType !== bitcoin.Transaction.SIGHASH_ALL)
    throw Error('Unsupported signature hash type');
  const digest = tx.hashForSignature(0, redeem, decoded.hashType);
  if (!secp256k1.verify(decoded.signature, digest, pubkey, {lowS: false, prehash: false}))
    throw Error('OP_CHECKSIG verification failed');
  return Object.freeze({p2shHashValid:true,cltvValid:true,checksigValid:true,
    knownScriptTemplateValidated:true,fullConsensusValidation:false,broadcast:false});
}
