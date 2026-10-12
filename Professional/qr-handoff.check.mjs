import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildUnsignedCltvPsbt } from './unsigned-cltv-psbt.mjs';
import { prepareUnsignedPsbtForQr } from './qr-handoff.mjs';
const hash=(a,b)=>createHash(a).update(b).digest();
const pub=Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd','hex');
const redeem=Buffer.concat([Buffer.from([1,110,0xb1,0x75,33]),pub,Buffer.from([0xac])]);
const p2sh=Buffer.concat([Buffer.from([0xa9,20]),hash('ripemd160',hash('sha256',redeem)),Buffer.from([0x87])]);
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;};
const funding=Buffer.concat([u32(2),Buffer.from([1]),Buffer.alloc(32,1),u32(0),Buffer.from([0]),u32(0xffffffff),Buffer.from([1]),u64(100000),Buffer.from([23]),p2sh,u32(0)]);
const txid=Buffer.from(hash('sha256',hash('sha256',funding))).reverse().toString('hex');
const make=()=>buildUnsignedCltvPsbt({fundingTxHex:funding.toString('hex'),vout:0,expectedTxid:txid,expectedSats:100000,redeemScriptHex:redeem.toString('hex'),signerPubkeyHex:pub.toString('hex'),masterFingerprintHex:'e29ac13c',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],locktime:110,destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000});
test('QR handoff accepts only independently parsed unsigned PSBT',()=>{
 const a=make();const b=prepareUnsignedPsbtForQr(a.psbtBase64,a.summary);
 assert.equal(b.format,'psbt-v0');assert.equal(b.nextEncoder,'ur:crypto-psbt');
 assert.equal(b.psbtBytes.toString('hex'),a.psbtHex);
});
test('QR handoff rejects mismatched destination, fee, signer and locktime',()=>{
 const a=make();
 for(const patch of [{payoutSats:98000},{feeSats:2000},{locktime:111},{signerPubkeyHex:'02'+'00'.repeat(32)},{destinationScriptHex:'0014'+'cd'.repeat(20)}]){
   assert.throws(()=>prepareUnsignedPsbtForQr(a.psbtBase64,{...a.summary,...patch}));
 }
});
test('QR handoff rejects malformed or truncated base64',()=>{
 const a=make();assert.throws(()=>prepareUnsignedPsbtForQr('!!!',a.summary));
 assert.throws(()=>prepareUnsignedPsbtForQr(Buffer.from('70736274ff','hex').toString('base64'),a.summary));
});
