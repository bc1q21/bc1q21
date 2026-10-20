// Offline verification of Jade-signed release 1 for the SAME funded 24-output regtest gift.
// Requires signed public PSBT QR frames and the approved unsigned handoff.
// No keys, hardware calls, network RPC, signing or broadcast.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {URDecoder} from '@ngraveio/bc-ur';
import cbor from 'cbor';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {verifyReturnedSignedProfessionalPsbt} from './verify-signed-psbt-return.mjs';
import {auditSameGiftUnsignedHandoff} from './audit-same-gift-unsigned-handoff.mjs';
const [frameFile,manifestFile]=process.argv.slice(2);
assert.ok(frameFile&&manifestFile,'Usage: node verify-same-gift-jade-signed-qr.mjs <frames.txt> <handoff.json>');
const lines=readFileSync(frameFile,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>/^ur:crypto-psbt\//i.test(s));
assert.ok(lines.length>=19 && lines.length<=512,'Insufficient or excessive QR capture');
const decoder=new URDecoder();
for(const part of lines)decoder.receivePart(part);
assert.equal(decoder.isComplete(),true,'Incomplete QR fountain capture; retain original frames and rescan only if necessary');
assert.equal(decoder.isSuccess(),true,'Invalid QR fountain checksum');
const ur=decoder.resultUR();
assert.equal(ur.type,'crypto-psbt');
const decoded=cbor.decodeFirstSync(Buffer.from(ur.cbor));
assert.ok(Buffer.isBuffer(decoded),'Expected CBOR PSBT bytes');
const signedBytes=Buffer.from(decoded);
assert.equal(signedBytes.subarray(0,5).toString('hex'),'70736274ff');
const m=JSON.parse(readFileSync(manifestFile,'utf8'));
auditSameGiftUnsignedHandoff(m);
assert.equal(m.signingAuthorized,false);
assert.equal(m.broadcastAuthorized,false);
const unsigned=bitcoin.Psbt.fromBase64(m.unsignedPsbtBase64,{network:bitcoin.networks.regtest});
const signed=bitcoin.Psbt.fromBuffer(signedBytes,{network:bitcoin.networks.regtest});
const returnGate=verifyReturnedSignedProfessionalPsbt(m.unsignedPsbtBase64,signed.toBase64(),m.psbtSha256);
assert.equal(returnGate.transactionMatches,true);
assert.equal(signed.txInputs.length,1);assert.equal(signed.txOutputs.length,1);
const a=unsigned.data.inputs[0],b=signed.data.inputs[0];
assert.equal(b.partialSig?.length,1,'Exactly one Jade partial signature required');
assert.equal(Buffer.from(b.partialSig[0].pubkey).toString('hex'),m.signerPubkeyHex,'Unexpected signer');
assert.equal(Buffer.from(b.partialSig[0].signature).at(-1),bitcoin.Transaction.SIGHASH_ALL,'Unsupported sighash');
assert.equal(Buffer.from(b.redeemScript).toString('hex'),m.redeemScriptHex);
assert.deepEqual(Buffer.from(b.nonWitnessUtxo),Buffer.from(a.nonWitnessUtxo));
const valid=signed.validateSignaturesOfInput(0,(pubkey,hash,compactSig)=>
  secp256k1.verify(Buffer.from(compactSig),Buffer.from(hash),Buffer.from(pubkey),{lowS:false,prehash:false}));
assert.equal(valid,true,'Cryptographic Jade ECDSA verification FAILED');
console.log('PASS_SAME_GIFT_JADE_HARDWARE_SIGNED_PSBT',JSON.stringify({
  network:'regtest',outpoint:m.fundingTxid+':'+m.vout,
  signedPsbtSha256:createHash('sha256').update(signedBytes).digest('hex'),
  approvedUnsignedPsbtSha256:m.psbtSha256,frames:lines.length,
  signatureCount:1,ecdsaVerified:true,unsignedTransactionUnchanged:true,
  bitcoinCoreConsensusChecked:false,broadcast:false}));
