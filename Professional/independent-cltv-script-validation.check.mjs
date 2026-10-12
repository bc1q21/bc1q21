import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import { finalizeSyntheticCltvPsbt } from './finalize-synthetic-cltv.mjs';
import { independentlyValidateSyntheticCltv } from './independent-cltv-script-validation.mjs';
import { readFileSync } from 'node:fs';
// Load the already-reviewed synthetic fixture test without copying private key material.
const fixtureText = readFileSync(new URL('./finalize-synthetic-cltv.check.mjs',import.meta.url),'utf8');
const match=fixtureText.match(/const signed=Buffer.from\('([^']+)'/);
assert.ok(match,'Signed synthetic PSBT fixture missing');
const signed=Buffer.from(match[1],'base64');
const original=bitcoin.Psbt.fromBuffer(signed);
const funding=original.data.inputs[0].nonWitnessUtxo.toString('hex');
delete original.data.inputs[0].partialSig;
const pubkey='032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd';
const finalized=finalizeSyntheticCltvPsbt(signed,original.toBase64(),pubkey);
const check=(raw,fundingHex=funding)=>independentlyValidateSyntheticCltv(raw,fundingHex,pubkey);

test('actual Jade synthetic final transaction passes independent known-script checks',()=>{
 const r=check(finalized.rawTransactionHex);
 assert.equal(r.p2shHashValid,true);
 assert.equal(r.cltvValid,true);
 assert.equal(r.checksigValid,true);
 assert.equal(r.fullConsensusValidation,false);
});
test('changing final transaction locktime below CLTV threshold is rejected',()=>{
 const tx=bitcoin.Transaction.fromHex(finalized.rawTransactionHex);
 tx.locktime=109;
 assert.throws(()=>check(tx.toHex()),/CHECKLOCKTIMEVERIFY/);
});
test('changing signature bytes in finalized scriptSig is rejected',()=>{
 const tx=bitcoin.Transaction.fromHex(finalized.rawTransactionHex);
 const chunks=bitcoin.script.decompile(tx.ins[0].script);
 const sig=Buffer.from(chunks[0]); sig[10]^=1;
 tx.ins[0].script=bitcoin.script.compile([sig,chunks[1]]);
 assert.throws(()=>check(tx.toHex()));
});
test('changing funding scriptPubKey is rejected',()=>{
 const f=bitcoin.Transaction.fromHex(funding);
 f.outs[0].script=Buffer.from('51','hex');
 assert.throws(()=>check(finalized.rawTransactionHex,f.toHex()),/Funding outpoint mismatch|P2SH HASH160/);
});
test('changing final transaction output invalidates signature',()=>{
 const tx=bitcoin.Transaction.fromHex(finalized.rawTransactionHex);
 tx.outs[0].value-=1;
 assert.throws(()=>check(tx.toHex()),/CHECKSIG/);
});
