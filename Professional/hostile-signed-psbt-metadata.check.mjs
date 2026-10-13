// Regressions for hostile PSBT metadata returned from a signer.
// Synthetic regtest only; no keys, signing, broadcast, or network.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import { verifyReturnedSignedProfessionalPsbt } from './verify-signed-psbt-return.mjs';
const prev=new bitcoin.Transaction();prev.addInput(Buffer.alloc(32,1),0);prev.addOutput(Buffer.from('0014'+'aa'.repeat(20),'hex'),100000);
const originalPsbt=new bitcoin.Psbt({network:bitcoin.networks.regtest});
originalPsbt.addInput({hash:prev.getId(),index:0,sequence:0xfffffffe,nonWitnessUtxo:prev.toBuffer(),redeemScript:Buffer.from('51','hex')});
originalPsbt.addOutput({script:Buffer.from('0014'+'bb'.repeat(20),'hex'),value:99000});
const original=originalPsbt.toBase64(),digest=createHash('sha256').update(Buffer.from(original,'base64')).digest('hex');
const pubkey=Buffer.from('02'+'11'.repeat(32),'hex'),signature=Buffer.from('300602010102010101','hex');
const signed=()=>{const p=bitcoin.Psbt.fromBase64(original);p.updateInput(0,{partialSig:[{pubkey,signature}]});return p;};
assert.equal(verifyReturnedSignedProfessionalPsbt(original,signed().toBase64(),digest).transactionMatches,true);
const cases=[
 ['unknown global metadata',p=>p.addUnknownKeyValToGlobal({key:Buffer.from('fc01','hex'),value:Buffer.from('01','hex')}),/Unsupported returned global PSBT field/],
 ['unknown input metadata',p=>p.addUnknownKeyValToInput(0,{key:Buffer.from('fc02','hex'),value:Buffer.from('01','hex')}),/Unsupported returned input PSBT field/],
 ['unknown output metadata',p=>p.addUnknownKeyValToOutput(0,{key:Buffer.from('fc03','hex'),value:Buffer.from('01','hex')}),/Unsupported returned output PSBT field/],
 ['unapproved sighash metadata',p=>p.updateInput(0,{sighashType:bitcoin.Transaction.SIGHASH_NONE}),/Returned sighash metadata differs/]
];
for(const [name,mutate,pattern] of cases){
 const p=signed();mutate(p);
 assert.notEqual(p.toBase64(),signed().toBase64(),name+' must change PSBT bytes');
 assert.throws(()=>verifyReturnedSignedProfessionalPsbt(original,p.toBase64(),digest),pattern,name);
}
const two=signed();
two.updateInput(0,{partialSig:[{pubkey,signature},{pubkey:Buffer.from('03'+'22'.repeat(32),'hex'),signature}]});
assert.throws(()=>verifyReturnedSignedProfessionalPsbt(original,two.toBase64(),digest),/Exactly one partial signature required/);
console.log('PASS: unexpected global/input/output PSBT fields, unapproved sighash metadata and multiple signatures rejected');
