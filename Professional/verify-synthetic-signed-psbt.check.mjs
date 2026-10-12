// Negative tests for isolated synthetic signed-PSBT verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import { buildUnsignedCltvPsbt } from './unsigned-cltv-psbt.mjs';
import { verifySyntheticSignedPsbt } from './verify-synthetic-signed-psbt.mjs';
const hash=(a,b)=>createHash(a).update(b).digest();
const pub=Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd','hex');
const redeem=Buffer.concat([Buffer.from([1,110,0xb1,0x75,33]),pub,Buffer.from([0xac])]);
const p2sh=Buffer.concat([Buffer.from([0xa9,20]),hash('ripemd160',hash('sha256',redeem)),Buffer.from([0x87])]);
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;};
const funding=Buffer.concat([u32(2),Buffer.from([1]),Buffer.alloc(32,1),u32(0),Buffer.from([0]),u32(0xffffffff),Buffer.from([1]),u64(100000),Buffer.from([23]),p2sh,u32(0)]);
const txid=Buffer.from(hash('sha256',hash('sha256',funding))).reverse().toString('hex');
const fixture=buildUnsignedCltvPsbt({fundingTxHex:funding.toString('hex'),vout:0,expectedTxid:txid,expectedSats:100000,redeemScriptHex:redeem.toString('hex'),signerPubkeyHex:pub.toString('hex'),masterFingerprintHex:'e29ac13c',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],locktime:110,destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000});
const base=()=>bitcoin.Psbt.fromBase64(fixture.psbtBase64);
const check=p=>verifySyntheticSignedPsbt(p.toBuffer(),fixture.psbtBase64,pub.toString('hex'));
test('unsigned PSBT is not accepted as signed',()=>assert.throws(()=>check(base()),/signature/i));
test('modified output is rejected even if partial signature exists',()=>{
  const p=base();p.updateOutput(0,{unknownKeyVals:[{key:Buffer.from('fc01','hex'),value:Buffer.from([1])}]});
  p.addOutput({script:Buffer.from('0014'+'cc'.repeat(20),'hex'),value:546});
  assert.throws(()=>check(p),/transaction|count/i);
});
test('wrong public key is rejected before ECDSA validation',()=>{
  const p=base();p.updateInput(0,{partialSig:[{pubkey:Buffer.from('02'+'11'.repeat(32),'hex'),signature:Buffer.from('300602010102010101','hex')}]});
  assert.throws(()=>check(p),/signer signature/i);
});
test('invalid DER signature is rejected',()=>{
  const p=base();p.updateInput(0,{partialSig:[{pubkey:pub,signature:Buffer.from('300602010102010101','hex')}]});
  assert.throws(()=>check(p));
});
test('changed redeem script is rejected',()=>{
  const p=base();p.data.inputs[0].redeemScript=Buffer.from('51','hex');
  assert.throws(()=>check(p),/redeemScript/i);
});
