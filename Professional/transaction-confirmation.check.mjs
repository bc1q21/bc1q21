import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { createProfessionalTransactionConfirmation } from './transaction-confirmation.mjs';
const pub=n=>Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),n]),true));
const signer=pub(9);
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(110),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
 bitcoin.opcodes.OP_DROP,signer,bitcoin.opcodes.OP_CHECKSIG]);
const p2sh=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:signer.toString('hex'),locktime:110,
 redeemScriptHex:redeem.toString('hex'),fundingAddress:p2sh.address};
const prev=new bitcoin.Transaction();prev.version=2;prev.addInput(Buffer.alloc(32,1),0);prev.addOutput(p2sh.output,100000);
const destination=bitcoin.payments.p2wpkh({pubkey:pub(10),network:bitcoin.networks.regtest});
const attacker=bitcoin.payments.p2wpkh({pubkey:pub(11),network:bitcoin.networks.regtest});
const funding={fundingTxHex:prev.toHex(),vout:0,expectedTxid:prev.getId(),expectedSats:100000,
 masterFingerprintHex:'00000009',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:destination.output.toString('hex'),destinationSats:99000};
const approved=Object.freeze({destinationScriptHex:funding.destinationScriptHex,destinationSats:99000,
 expectedTxid:funding.expectedTxid,vout:0,expectedSats:100000,locktime:110,signerPubkeyHex:handoff.signerPubkeyHex});
const receipt=createProfessionalTransactionConfirmation(handoff,funding,approved);
assert.equal(receipt.network,'regtest');
assert.equal(receipt.fundingTxid,prev.getId());
assert.equal(receipt.inputSats,100000);assert.equal(receipt.payoutSats,99000);assert.equal(receipt.feeSats,1000);
assert.equal(receipt.destinationAddress,destination.address);
assert.equal(receipt.locktime,110);assert.equal(receipt.locktimeType,'block-height');
assert.equal(receipt.signerPubkeyHex,signer.toString('hex'));
assert.match(receipt.psbtSha256,/^[a-f0-9]{64}$/);
assert.equal(receipt.approvalVerified,true);assert.equal(receipt.signed,false);assert.equal(receipt.broadcast,false);
assert.equal(Object.isFrozen(receipt),true);
assert.throws(()=>createProfessionalTransactionConfirmation(handoff,{...funding,destinationScriptHex:attacker.output.toString('hex')},approved),/Approval mismatch/);
assert.throws(()=>createProfessionalTransactionConfirmation(handoff,{...funding,destinationSats:98000},approved),/Approval mismatch/);
assert.throws(()=>createProfessionalTransactionConfirmation(handoff,funding,{...approved,feeSats:1000}),/Exact independent approval/);
console.log('PASS: confirmation derives exact destination, payout, fee, locktime, signer and PSBT digest from approved unsigned transaction');
