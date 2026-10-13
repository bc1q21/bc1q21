// Isolated, in-process only: separate approved QR sessions cannot both
// complete a return for the same public Bitcoin funding outpoint.
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {createInMemoryProfessionalReplayGuard} from './in-memory-replay-guard.mjs';
import {prepareControlledProfessionalQrSession} from './controlled-qr-session.mjs';
const key=Buffer.alloc(32);key[31]=9;
const pub=Buffer.from(secp256k1.getPublicKey(key,true));
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(110),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pub,bitcoin.opcodes.OP_CHECKSIG]);
const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:pub.toString('hex'),locktime:110,redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address};
const prev=new bitcoin.Transaction();prev.version=2;prev.addInput(Buffer.alloc(32,1),0);prev.addOutput(payment.output,100000);
const dest=bitcoin.payments.p2wpkh({pubkey:Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),10]),true)),network:bitcoin.networks.regtest});
const funding={fundingTxHex:prev.toHex(),vout:0,expectedTxid:prev.getId(),expectedSats:100000,masterFingerprintHex:'00000009',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],destinationScriptHex:dest.output.toString('hex'),destinationSats:99000};
const intent={destinationScriptHex:funding.destinationScriptHex,destinationSats:99000,expectedTxid:funding.expectedTxid,vout:0,expectedSats:100000,locktime:110,signerPubkeyHex:handoff.signerPubkeyHex};
const guard=createInMemoryProfessionalReplayGuard();
const a=prepareControlledProfessionalQrSession(handoff,funding,intent,guard);
const b=prepareControlledProfessionalQrSession(handoff,funding,intent,guard);
for(const session of [a,b]){
 const digest=session.confirmation().psbtSha256;
 session.approve({confirmedDigest:digest,acknowledged:true});
 session.exportQrFrames({fragmentLength:120,frameCount:96});
}
assert.throws(()=>a.completeSignedReturn('not a signed PSBT'),/Invalid PSBT (?:base64|structure)/);
assert.equal(guard.has(prev.getId(),0),true);
assert.equal(guard.count(),1);
assert.throws(()=>b.completeSignedReturn('not a signed PSBT'),/Funding outpoint already claimed/);
assert.throws(()=>b.completeSignedReturn('not a signed PSBT'),/attempt already consumed/);
assert.throws(()=>a.completeSignedReturn('not a signed PSBT'),/attempt already consumed/);
const otherTxid='ab'.repeat(32);
assert.equal(guard.claim(otherTxid,0),true);
assert.throws(()=>guard.claim(otherTxid.toUpperCase(),0),/already claimed/);
assert.equal(guard.claim(otherTxid,1),true);
assert.equal(guard.count(),3);
console.log('PASS: shared in-process guard blocks cross-session outpoint replay, including failed signed returns; no persistence or broadcast');
