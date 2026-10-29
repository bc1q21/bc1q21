import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {createHash} from 'node:crypto';
import {verifyCreatorSignedQrPayload} from './creator-signed-qr-verification-gate.mjs';
const privateKey=Buffer.alloc(32);privateKey[31]=1;
const pub=Buffer.from(secp256k1.getPublicKey(privateKey,true));
const network=bitcoin.networks.regtest;
const script=bitcoin.payments.p2wpkh({pubkey:pub,network}).output;
function sample(){
 const p=new bitcoin.Psbt({network});
 p.addInput({hash:'ab'.repeat(32),index:0,witnessUtxo:{script,value:15000},
   bip32Derivation:[{masterFingerprint:Buffer.from('e29ac13c','hex'),
     path:"m/84'/0'/0'/0/0",pubkey:pub}]});
 p.addOutput({script:Buffer.from('a914'+'11'.repeat(20)+'87','hex'),value:12000});
 p.addOutput({script,value:2000});
 const raw=p.toBuffer();
 const unsigned={format:'bc1q21-professional-funded-distribution-unsigned-psbt-v1',
   network:'regtest',signed:false,broadcast:false,hardwareSignatureVerified:false,
   unsignedPsbtBase64:p.toBase64(),psbtSha256:createHash('sha256').update(raw).digest('hex'),
   fundingInputCount:1,totalOutputCount:2};
 p.signInput(0,{publicKey:pub,sign:hash=>Buffer.from(secp256k1.sign(hash,privateKey).toCompactRawBytes())});
 return {unsigned,signed:p.toBuffer()};
}
test('decoded Jade QR payload is cryptographically verified and cannot broadcast',()=>{
 const {unsigned,signed}=sample();
 const result=verifyCreatorSignedQrPayload(unsigned,signed);
 assert.equal(result.giftSpecificVerified,true);
 assert.equal(result.signatureCryptographicallyVerified,true);
 assert.equal(result.canBroadcast,false);
 assert.equal(result.diagnosticOnly,true);
 assert.equal(result.finalizedTransaction,true);
 assert.match(result.finalizedTxid,/^[a-f0-9]{64}$/);
 assert.match(result.finalizedRawTransactionHex,/^[a-f0-9]+$/);
 const tx=bitcoin.Transaction.fromHex(result.finalizedRawTransactionHex);
 assert.equal(tx.getId(),result.finalizedTxid);
 assert.equal(tx.ins.length,1);
 assert.equal(tx.outs.length,2);
 assert.ok(tx.ins[0].witness.length>0);
});
test('rejects unsigned, modified, malformed, and non-PSBT QR payloads',()=>{
 const {unsigned,signed}=sample();
 assert.throws(()=>verifyCreatorSignedQrPayload(unsigned,Buffer.from(unsigned.unsignedPsbtBase64,'base64')));
 assert.throws(()=>verifyCreatorSignedQrPayload(unsigned,Buffer.from('not psbt')));
 const changed=Buffer.from(signed);changed[changed.length-2]^=1;
 assert.throws(()=>verifyCreatorSignedQrPayload(unsigned,changed));
 assert.throws(()=>verifyCreatorSignedQrPayload(unsigned,Buffer.alloc(100001)));
});
