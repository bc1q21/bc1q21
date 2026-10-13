// Synthetic regtest negative tests: even a mathematically valid signature
// must fail when CLTV locktime, sequence, funding script, or signer is wrong.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {verifyProfessionalReturnedSignature} from './verify-returned-signature.mjs';
const key=Buffer.alloc(32);key[31]=9;
const pub=Buffer.from(secp256k1.getPublicKey(key,true));
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(110),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pub,bitcoin.opcodes.OP_CHECKSIG]);
const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
function fixture({locktime=110,sequence=0xfffffffe,wrongFunding=false,wrongSigner=false}={}){
 const prev=new bitcoin.Transaction();prev.version=2;prev.addInput(Buffer.alloc(32,1),0);
 prev.addOutput(wrongFunding?Buffer.from('0014'+'ab'.repeat(20),'hex'):payment.output,100000);
 const psbt=new bitcoin.Psbt({network:bitcoin.networks.regtest});
 psbt.setVersion(2);psbt.setLocktime(locktime);
 psbt.addInput({hash:prev.getId(),index:0,sequence,nonWitnessUtxo:prev.toBuffer(),redeemScript:redeem});
 psbt.addOutput({script:Buffer.from('0014'+'cd'.repeat(20),'hex'),value:99000});
 const original=psbt.toBase64(),digest=createHash('sha256').update(Buffer.from(original,'base64')).digest('hex');
 const tx=bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());
 const hash=tx.hashForSignature(0,redeem,bitcoin.Transaction.SIGHASH_ALL);
 const signature=bitcoin.script.signature.encode(Buffer.from(secp256k1.sign(hash,key,{lowS:true}).toCompactRawBytes()),bitcoin.Transaction.SIGHASH_ALL);
 const signed=bitcoin.Psbt.fromBase64(original);
 const different=Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),10]),true));
 signed.updateInput(0,{partialSig:[{pubkey:wrongSigner?different:pub,signature}]});
 return {original,signed:signed.toBase64(),digest};
}
const good=fixture();
assert.equal(verifyProfessionalReturnedSignature(good.original,good.signed,good.digest).signatureCryptographicallyVerified,true);
for(const [scenario,options,pattern] of [
 ['locktime below CLTV requirement',{locktime:109},/CLTV transaction mismatch/],
 ['final input sequence disables CLTV',{sequence:0xffffffff},/CLTV transaction mismatch/],
 ['funding output does not pay CLTV script',{wrongFunding:true},/Funding script mismatch/],
 ['signature pubkey differs from CLTV signer',{wrongSigner:true},/Signer does not match CLTV script/]
]){
 const item=fixture(options);
 assert.throws(()=>verifyProfessionalReturnedSignature(item.original,item.signed,item.digest),pattern,scenario);
}
console.log('PASS: valid signature alone cannot bypass CLTV locktime, non-final sequence, funding script, or signer requirements');
