import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {snapshotFundedDistributionIntent} from './funded-distribution-intent.mjs';
import {buildUnsignedFundedDistributionPsbt} from './unsigned-funded-distribution-psbt.mjs';
import {reviewProfessionalPreSigningEvidence} from './review-pre-signing-evidence.mjs';
import {createProfessionalGiftEditGate} from './gift-edit-gate.mjs';
const key='0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const network=bitcoin.networks.regtest;
const script=bitcoin.payments.p2wpkh({pubkey:Buffer.from(key,'hex'),network}).output.toString('hex');
const date='2030-01-01',locktime=Date.parse(date+'T00:00:00Z')/1000;
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
 bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,Buffer.from(key,'hex'),bitcoin.opcodes.OP_CHECKSIG]);
const giftScript=bitcoin.payments.p2sh({redeem:{output:redeem},network}).output.toString('hex');
const plan={format:'bc1q21-professional-retail-plan-preview-v1',status:'UNFUNDED_PREVIEW_NOT_SIGNABLE',
 releases:[{date,amountSats:12000}],totalSats:12000};
const intent=snapshotFundedDistributionIntent({network:'regtest',plan,
 utxos:[{txid:'ab'.repeat(32),vout:0,valueSats:15000,scriptPubKeyHex:script}],
 giftOutputs:[{date,locktime,valueSats:12000,scriptPubKeyHex:giftScript}],
 changeOutput:{valueSats:2000,scriptPubKeyHex:script},networkFeeSats:1000});
const unsigned=buildUnsignedFundedDistributionPsbt(intent,{
 masterFingerprintHex:'e29ac13c',publicKeyHex:key,path:"m/84'/0'/0'/0/0"});
const observations=[{txid:intent.inputs[0].txid,vout:0,
 response:{value:0.00015,confirmations:3,scriptPubKey:{hex:script}}}];
const args={intent,plan,recipientPublicKeys:[key],observations,unsigned};
test('combined inspection never creates a signing credential',()=>{
 const review=reviewProfessionalPreSigningEvidence(args);
 assert.equal(review.unsignedTransactionConsistent,true);
 assert.equal(review.canSign,false);
 assert.equal(review.authenticatedBitcoinCoreFunding,false);
 assert.equal(review.recipientKeyOriginAuthenticated,false);
 const gate=createProfessionalGiftEditGate();gate.startFunding();
 assert.throws(()=>gate.confirmFunding(review));
});
test('caller supplied flags cannot bypass independent wallet or node provenance',()=>{
 const review=reviewProfessionalPreSigningEvidence({
  ...args,chainVerified:true,recipientKeyOriginAuthenticated:true,
  signingAuthorized:true,authenticatedBitcoinCoreFunding:true
 });
 assert.equal(review.canSign,false);
 assert.equal(review.signingAuthorized,false);
 assert.equal(review.recipientKeyOriginAuthenticated,false);
});
test('pre-signing review rejects changed approved PSBT hash',()=>{
 assert.throws(()=>reviewProfessionalPreSigningEvidence({
  ...args,unsigned:{...unsigned,psbtSha256:'ff'.repeat(32)}
 }));
});
