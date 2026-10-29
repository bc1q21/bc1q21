import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {createHash} from 'node:crypto';
import {verifySignedFundedDistributionPsbt} from './verify-signed-funded-distribution.mjs';
const priv=Buffer.alloc(32);priv[31]=1;
const pub=Buffer.from(secp256k1.getPublicKey(priv,true));
const network=bitcoin.networks.regtest;
const script=bitcoin.payments.p2wpkh({pubkey:pub,network}).output;
function fixture(){
 const psbt=new bitcoin.Psbt({network});
 psbt.addInput({hash:'ab'.repeat(32),index:0,
   witnessUtxo:{script,value:15000},
   bip32Derivation:[{masterFingerprint:Buffer.from('e29ac13c','hex'),
     path:"m/84'/0'/0'/0/0",pubkey:pub}]});
 psbt.addOutput({script:Buffer.from('a914'+'11'.repeat(20)+'87','hex'),value:12000});
 psbt.addOutput({script,value:2000});
 const raw=psbt.toBuffer();
 const unsigned={format:'bc1q21-professional-funded-distribution-unsigned-psbt-v1',
   network:'regtest',signed:false,broadcast:false,hardwareSignatureVerified:false,
   unsignedPsbtBase64:psbt.toBase64(),
   psbtSha256:createHash('sha256').update(raw).digest('hex'),
   fundingInputCount:1,totalOutputCount:2};
 const signed=bitcoin.Psbt.fromBuffer(raw,{network});
 signed.signInput(0,{publicKey:pub,sign:hash=>Buffer.from(secp256k1.sign(hash,priv).toCompactRawBytes())});
 return {unsigned,signed};
}
test('accepts cryptographically valid matching regtest creator signature',()=>{
 const {unsigned,signed}=fixture();
 const result=verifySignedFundedDistributionPsbt(unsigned,signed.toBase64());
 assert.equal(result.signatureCryptographicallyVerified,true);
 assert.equal(result.inputSignaturesVerified,1);
 assert.equal(result.broadcast,false);
});
test('rejects unsigned, altered output, wrong signature, changed funding metadata',()=>{
 const {unsigned,signed}=fixture();
 assert.throws(()=>verifySignedFundedDistributionPsbt(unsigned,unsigned.unsignedPsbtBase64));
 const wrong=bitcoin.Psbt.fromBase64(signed.toBase64(),{network});
 wrong.data.globalMap.unsignedTx.tx.outs[0].value=11999;
 assert.throws(()=>verifySignedFundedDistributionPsbt(unsigned,wrong.toBase64()));
 const corrupt=bitcoin.Psbt.fromBase64(signed.toBase64(),{network});
 const sig=Buffer.from(corrupt.data.inputs[0].partialSig[0].signature);
 sig[10]^=1;
 corrupt.data.inputs[0].partialSig[0].signature=sig;
 assert.throws(()=>verifySignedFundedDistributionPsbt(unsigned,corrupt.toBase64()));
 const changed=bitcoin.Psbt.fromBase64(signed.toBase64(),{network});
 changed.data.inputs[0].witnessUtxo.value=16000;
 assert.throws(()=>verifySignedFundedDistributionPsbt(unsigned,changed.toBase64()));
});
