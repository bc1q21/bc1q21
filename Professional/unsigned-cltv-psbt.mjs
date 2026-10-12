// bc1q21 Professional: offline, Node.js-only, unsigned legacy P2SH/CLTV PSBT v0 builder.
// No seed words, WIFs, signing, network requests, or broadcasting.
// Requires Node.js 20+; development fixture tooling only, NOT browser/production code.
import { createHash } from 'node:crypto';

const fail = (message) => { throw new Error(message); };
const hash = (algo, bytes) => createHash(algo).update(bytes).digest();
const sha256d = (bytes) => hash('sha256', hash('sha256', bytes));
const hash160 = (bytes) => hash('ripemd160', hash('sha256', bytes));
const hex = (value, label, size) => {
  if (typeof value !== 'string' || value.length % 2 || !/^[0-9a-f]*$/i.test(value))
    fail('Invalid hex: ' + label);
  const bytes = Buffer.from(value, 'hex');
  if (size !== undefined && bytes.length !== size) fail('Wrong length: ' + label);
  return bytes;
};
const uint = (value, max, label) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) fail('Invalid ' + label);
  return value;
};
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(uint(n, 0xffffffff, 'u32')); return b; };
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(uint(n, 2100000000000000, 'satoshis'))); return b; };
const vi = (n) => {
  uint(n, Number.MAX_SAFE_INTEGER, 'compactSize');
  if (n < 253) return Buffer.from([n]);
  if (n <= 65535) { const b = Buffer.alloc(3); b[0] = 253; b.writeUInt16LE(n, 1); return b; }
  if (n <= 0xffffffff) return Buffer.concat([Buffer.from([254]), u32(n)]);
  return Buffer.concat([Buffer.from([255]), u64(n)]);
};
const field = (key, value) => Buffer.concat([vi(key.length), key, vi(value.length), value]);
const readVar = (b, at) => {
  if (at >= b.length) fail('Truncated compactSize');
  const tag = b[at];
  if (tag < 253) return [tag, at + 1];
  if (tag === 253) {
    if (at + 3 > b.length) fail('Truncated compactSize');
    const v = b.readUInt16LE(at + 1); if (v < 253) fail('Noncanonical compactSize');
    return [v, at + 3];
  }
  if (tag === 254) {
    if (at + 5 > b.length) fail('Truncated compactSize');
    const v = b.readUInt32LE(at + 1); if (v <= 65535) fail('Noncanonical compactSize');
    return [v, at + 5];
  }
  fail('Oversized compactSize');
};
const take = (b, offset, count) => {
  if (count < 0 || offset + count > b.length) fail('Truncated transaction');
  return [b.subarray(offset, offset + count), offset + count];
};
function parseLegacyTx(b) {
  if (b.length < 10 || b.length > 4000000) fail('Invalid funding transaction size');
  let at = 0;
  const version = b.readUInt32LE(at); at += 4;
  let count; [count, at] = readVar(b, at);
  if (count === 0 || count > 100000) fail('Invalid input count or SegWit marker');
  for (let i = 0; i < count; i++) {
    [, at] = take(b, at, 36);
    let len; [len, at] = readVar(b, at);
    [, at] = take(b, at, len + 4);
  }
  let outputs; [outputs, at] = readVar(b, at);
  if (outputs === 0 || outputs > 100000) fail('Invalid output count');
  const vouts = [];
  for (let i = 0; i < outputs; i++) {
    const [amount, next] = take(b, at, 8); at = next;
    const sats = amount.readBigUInt64LE();
    if (sats > 2100000000000000n) fail('Invalid output amount');
    let len; [len, at] = readVar(b, at);
    let script; [script, at] = take(b, at, len);
    vouts.push({ sats, script });
  }
  [, at] = take(b, at, 4);
  if (at !== b.length) fail('Trailing transaction bytes');
  return { version, vouts, txid: Buffer.from(sha256d(b)).reverse() };
}
function scriptLocktime(redeem, pubkey) {
  // Template: minimally encoded script-number push, OP_CLTV OP_DROP, 33-byte pubkey, OP_CHECKSIG.
  const len = redeem[0];
  if (len < 1 || len > 5 || redeem.length !== len + 37 ||
      redeem[1 + len] !== 0xb1 || redeem[2 + len] !== 0x75 ||
      redeem[3 + len] !== 0x21 || redeem[37 + len - 1] !== 0xac)
    fail('Unsupported CLTV redeemScript template');
  if (!redeem.subarray(4 + len, 37 + len).equals(pubkey)) fail('CLTV public key mismatch');
  const number = redeem.subarray(1, 1 + len);
  if (number[len - 1] & 0x80) fail('Negative CLTV script number');
  if (len > 1 && number[len - 1] === 0 && !(number[len - 2] & 0x80))
    fail('Nonminimal CLTV script number');
  let n = 0n;
  for (let i = 0; i < len; i++) n |= BigInt(number[i]) << BigInt(8 * i);
  if (n > 0xffffffffn) fail('CLTV locktime out of range');
  return Number(n);
}
function bip32Path(path) {
  if (!Array.isArray(path) || !path.length || path.length > 16) fail('Invalid BIP32 path');
  return Buffer.concat(path.map(n => u32(uint(n, 0xffffffff, 'BIP32 path element'))));
}
/**
 * Build a single-input, single-output, unsigned PSBT v0. Caller supplies a
 * verified destination scriptPubKey (NOT a human-readable address). Address
 * decoding/display and independent output approval are required before use.
 */
export function buildUnsignedCltvPsbt({
  fundingTxHex, vout, expectedTxid, expectedSats, redeemScriptHex,
  signerPubkeyHex, masterFingerprintHex, derivationPath,
  locktime, sequence = 0xfffffffe, destinationScriptHex, destinationSats
}) {
  const prev = hex(fundingTxHex, 'fundingTxHex');
  const funding = parseLegacyTx(prev);
  const index = uint(vout, 0xffffffff, 'vout');
  if (index >= funding.vouts.length) fail('Funding output index out of range');
  if (!funding.txid.equals(hex(expectedTxid, 'expectedTxid', 32)))
    fail('Funding txid mismatch');
  const source = funding.vouts[index];
  if (source.sats !== BigInt(uint(expectedSats, 2100000000000000, 'expectedSats')))
    fail('Funding amount mismatch');
  const pubkey = hex(signerPubkeyHex, 'signerPubkeyHex', 33);
  if (pubkey[0] !== 2 && pubkey[0] !== 3) fail('Not a compressed public key');
  const redeem = hex(redeemScriptHex, 'redeemScriptHex');
  const minimum = scriptLocktime(redeem, pubkey);
  const expectedScript = Buffer.concat([Buffer.from([0xa9, 0x14]), hash160(redeem), Buffer.from([0x87])]);
  if (!source.script.equals(expectedScript)) fail('RedeemScript does not match funding P2SH output');
  const nLockTime = uint(locktime, 0xffffffff, 'locktime');
  if ((nLockTime < 500000000) !== (minimum < 500000000) || nLockTime < minimum)
    fail('Transaction locktime does not satisfy CLTV');
  const nSequence = uint(sequence, 0xfffffffe, 'non-final sequence');
  const dest = hex(destinationScriptHex, 'destinationScriptHex');
  // Initial prototype permits standard P2WPKH (22 bytes) or P2PKH (25 bytes) outputs only.
  const p2wpkh = dest.length === 22 && dest[0] === 0 && dest[1] === 20;
  const p2pkh = dest.length === 25 && dest[0] === 0x76 && dest[1] === 0xa9 &&
    dest[2] === 20 && dest[23] === 0x88 && dest[24] === 0xac;
  if (!p2wpkh && !p2pkh) fail('Unsupported destination scriptPubKey');
  const payout = uint(destinationSats, 2100000000000000, 'destinationSats');
  if (payout < 546 || BigInt(payout) >= source.sats) fail('Invalid payout or fee');
  const fee = source.sats - BigInt(payout);
  if (fee > 100000n) fail('Prototype fee safety ceiling exceeded');
  const fingerprint = hex(masterFingerprintHex, 'masterFingerprintHex', 4);
  const path = bip32Path(derivationPath);
  const unsigned = Buffer.concat([
    u32(2), vi(1), Buffer.from(funding.txid).reverse(), u32(index),
    vi(0), u32(nSequence), vi(1), u64(payout), vi(dest.length), dest, u32(nLockTime)
  ]);
  const psbt = Buffer.concat([
    Buffer.from('70736274ff', 'hex'),
    field(Buffer.from([0x00]), unsigned), Buffer.from([0x00]),
    field(Buffer.from([0x00]), prev), // PSBT_IN_NON_WITNESS_UTXO
    field(Buffer.from([0x04]), redeem), // PSBT_IN_REDEEM_SCRIPT
    field(Buffer.concat([Buffer.from([0x06]), pubkey]), Buffer.concat([fingerprint, path])),
    Buffer.from([0x00]), // input map end
    Buffer.from([0x00])  // output map end
  ]);
  return {
    psbtBase64: psbt.toString('base64'),
    psbtHex: psbt.toString('hex'),
    summary: Object.freeze({
      txid: funding.txid.toString('hex'), vout: index,
      inputSats: Number(source.sats), payoutSats: payout, feeSats: Number(fee),
      locktime: nLockTime, sequence: nSequence,
      destinationScriptHex: dest.toString('hex'),
      signerPubkeyHex: pubkey.toString('hex')
    })
  };
}
