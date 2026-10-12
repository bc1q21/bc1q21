// Independent PSBT v0 map and unsigned transaction decoder (offline synthetic fixture).
// Run: node --test Professional/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildUnsignedCltvPsbt } from './unsigned-cltv-psbt.mjs';
const hash=(alg,b)=>createHash(alg).update(b).digest();
const sha2=b=>hash('sha256',hash('sha256',b));
const pub=Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd','hex');
const redeem=Buffer.concat([Buffer.from([1,110,0xb1,0x75,33]),pub,Buffer.from([0xac])]);
const p2sh=Buffer.concat([Buffer.from([0xa9,20]),hash('ripemd160',hash('sha256',redeem)),Buffer.from([0x87])]);
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;};
const funding=Buffer.concat([u32(2),Buffer.from([1]),Buffer.alloc(32,1),u32(0),Buffer.from([0]),u32(0xffffffff),Buffer.from([1]),u64(100000),Buffer.from([23]),p2sh,u32(0)]);
const txid=Buffer.from(sha2(funding)).reverse().toString('hex');
function varint(b,o){const n=b[o];if(n<253)return[n,o+1];if(n===253)return[b.readUInt16LE(o+1),o+3];if(n===254)return[b.readUInt32LE(o+1),o+5];throw Error('unsupported');}
function map(b,o){const m=[];while(true){let kl;[kl,o]=varint(b,o);if(kl===0)return[m,o];const key=b.subarray(o,o+kl);o+=kl;let vl;[vl,o]=varint(b,o);const val=b.subarray(o,o+vl);o+=vl;m.push([key,val]);}}
test('independent PSBT v0 field-by-field decoding',()=>{
 const built=buildUnsignedCltvPsbt({fundingTxHex:funding.toString('hex'),vout:0,expectedTxid:txid,expectedSats:100000,redeemScriptHex:redeem.toString('hex'),signerPubkeyHex:pub.toString('hex'),masterFingerprintHex:'e29ac13c',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],locktime:110,destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000});
 const b=Buffer.from(built.psbtBase64,'base64');assert.equal(b.subarray(0,5).toString('hex'),'70736274ff');
 let global,input,output,o=5;[global,o]=map(b,o);[input,o]=map(b,o);[output,o]=map(b,o);
 assert.equal(o,b.length);assert.equal(global.length,1);assert.equal(input.length,3);assert.equal(output.length,0);
 assert.equal(global[0][0].toString('hex'),'00');const tx=global[0][1];
 assert.equal(tx.readUInt32LE(0),2);assert.equal(tx[4],1);
 assert.equal(tx.subarray(5,37).toString('hex'),Buffer.from(txid,'hex').reverse().toString('hex'));
 assert.equal(tx.readUInt32LE(37),0);assert.equal(tx[41],0);
 assert.equal(tx.readUInt32LE(42),0xfffffffe);assert.equal(tx[46],1);
 assert.equal(tx.readBigUInt64LE(47),99000n);assert.equal(tx[55],22);
 assert.equal(tx.subarray(56,78).toString('hex'),'0014'+'ab'.repeat(20));
 assert.equal(tx.readUInt32LE(78),110);assert.equal(tx.length,82);
 assert.equal(input[0][0].toString('hex'),'00');assert.ok(input[0][1].equals(funding));
 assert.equal(input[1][0].toString('hex'),'04');assert.ok(input[1][1].equals(redeem));
 assert.equal(input[2][0][0],6);assert.ok(input[2][0].subarray(1).equals(pub));
 const deriv=input[2][1];assert.equal(deriv.subarray(0,4).toString('hex'),'e29ac13c');
 assert.deepEqual(Array.from({length:5},(_,i)=>deriv.readUInt32LE(4+i*4)),[0x80000054,0x80000000,0x80000000,1,10]);
 assert.equal(deriv.length,24);
});
