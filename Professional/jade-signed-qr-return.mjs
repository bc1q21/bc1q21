// Reusable Professional regtest Jade signed QR return. No keys, device access or broadcast.
// This is a cryptographic transport boundary, NOT beneficiary authorization.
import assert from 'node:assert/strict';
import {URDecoder} from '@ngraveio/bc-ur';
import cbor from 'cbor';
import bitcoin from 'bitcoinjs-lib';
import {auditSameGiftUnsignedHandoff} from './audit-same-gift-unsigned-handoff.mjs';
import {verifyReturnedSignedProfessionalPsbt} from './verify-signed-psbt-return.mjs';
import {verifySyntheticSignedPsbt} from './verify-synthetic-signed-psbt.mjs';

export function finalizeJadeSignedQrReturn({handoff,frames}) {
 auditSameGiftUnsignedHandoff(handoff);
 assert.ok(Array.isArray(frames)&&frames.length>0&&frames.length<=512,'Signed Jade QR frames required');
 const decoder=new URDecoder();
 for(const frame of frames){
  assert.match(frame,/^ur:crypto-psbt\//i,'Only signed crypto-psbt frames allowed');
  decoder.receivePart(frame.trim());
 }
 assert.ok(decoder.isComplete()&&decoder.isSuccess(),'Incomplete Jade signed QR');
 assert.equal(decoder.resultUR().type,'crypto-psbt');
 const raw=Buffer.from(cbor.decodeFirstSync(Buffer.from(decoder.resultUR().cbor)));
 const signed=bitcoin.Psbt.fromBuffer(raw,{network:bitcoin.networks.regtest});
 verifyReturnedSignedProfessionalPsbt(handoff.unsignedPsbtBase64,signed.toBase64(),handoff.psbtSha256);
 // Verify Jade's ECDSA signature, not merely the presence of signature bytes.
 verifySyntheticSignedPsbt(raw,handoff.unsignedPsbtBase64,handoff.signerPubkeyHex);
 const input=signed.data.inputs[0];
 assert.equal(input.partialSig?.length,1,'One Jade signature required');
 const redeem=Buffer.from(input.redeemScript);
 const sig=Buffer.from(input.partialSig[0].signature);
 assert.equal(sig.at(-1),bitcoin.Transaction.SIGHASH_ALL,'Unexpected signature hash type');
 assert.equal(Buffer.from(input.partialSig[0].pubkey).toString('hex'),handoff.signerPubkeyHex);
 signed.finalizeInput(0,()=>({finalScriptSig:bitcoin.script.compile([sig,redeem])}));
 const tx=signed.extractTransaction();
 assert.equal(tx.ins.length,1);assert.equal(tx.outs.length,1);
 assert.equal(tx.locktime,handoff.locktime);
 assert.equal(tx.outs[0].value,handoff.payoutSats);
 assert.equal(Buffer.from(tx.outs[0].script).toString('hex'),handoff.destinationScriptHex);
 assert.equal(Buffer.from(tx.ins[0].hash).reverse().toString('hex'),handoff.fundingTxid);
 assert.equal(tx.ins[0].index,handoff.vout);
 return Object.freeze({network:'regtest',txid:tx.getId(),rawTransactionHex:tx.toHex(),
  signedReturnTransportVerified:true,signatureCryptographicallyVerified:true,beneficiaryAuthorized:false,broadcast:false,canBroadcast:false});
}
