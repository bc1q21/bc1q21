import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {prepareGiftBoundBeneficiaryReview} from './gift-bound-beneficiary-review.mjs';

const pub=n=>Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),n]),true));
const signer=pub(9),redeem=bitcoin.script.compile([
 bitcoin.script.number.encode(110),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
 bitcoin.opcodes.OP_DROP,signer,bitcoin.opcodes.OP_CHECKSIG
]);
const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const publicHandoff={version:1,network:'regtest',signerPubkeyHex:signer.toString('hex'),
 locktime:110,redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address};
const tx=new bitcoin.Transaction();tx.version=2;tx.addInput(Buffer.alloc(32,1),0);tx.addOutput(payment.output,100000);
const destination=bitcoin.payments.p2wpkh({pubkey:pub(10),network:bitcoin.networks.regtest});
const funding={fundingTxHex:tx.toHex(),vout:0,expectedTxid:tx.getId(),expectedSats:100000,
 masterFingerprintHex:'00000009',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:destination.output.toString('hex'),destinationSats:99000};
const approvedIntent={destinationScriptHex:funding.destinationScriptHex,destinationSats:99000,
 expectedTxid:funding.expectedTxid,vout:0,expectedSats:100000,locktime:110,
 signerPubkeyHex:publicHandoff.signerPubkeyHex};
const giftEvidence={network:'regtest',outputsConsistent:true,tipStableDuringRead:true,
 fundingTxid:tx.getId(),releaseCount:1,verifiedOutputs:[{index:0,txid:tx.getId(),vout:0,sats:100000,scriptPubKeyHex:payment.output.toString('hex')}]};
const review=(e=giftEvidence,f=funding,a=approvedIntent)=>prepareGiftBoundBeneficiaryReview({
 giftEvidence:e,releaseIndex:0,publicHandoff,funding:f,approvedIntent:a
});

test('exact gift output matches derived PSBT confirmation without granting QR',()=>{
 const result=review();
 assert.equal(result.giftOutputMatched,true);
 assert.equal(result.exactPsbtMatched,true);
 assert.equal(result.transactionConfirmation.feeSats,1000);
 assert.match(result.transactionConfirmation.psbtSha256,/^[a-f0-9]{64}$/);
 assert.equal(result.recipientReviewed,false);
 assert.equal(result.canExportSigningQr,false);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
});

test('changed gift outpoint, amount or destination fails before review',()=>{
 assert.throws(()=>review({...giftEvidence,verifiedOutputs:[{index:0,txid:tx.getId(),vout:1,sats:100000}]}),/output mismatch/);
 assert.throws(()=>review({...giftEvidence,verifiedOutputs:[{index:0,txid:tx.getId(),vout:0,sats:99999}]}),/amount mismatch/);
 assert.throws(()=>review(giftEvidence,{...funding,destinationSats:98000}),/Funding payout differs/);
 assert.throws(()=>review(giftEvidence,funding,{...approvedIntent,destinationScriptHex:'0014'+'aa'.repeat(20)}),/Approval mismatch: destinationScriptHex/);
});

test('gift approval refuses a substituted locking script before issuing approval',()=>{
 assert.throws(()=>review({...giftEvidence,verifiedOutputs:[{
  ...giftEvidence.verifiedOutputs[0],scriptPubKeyHex:'0014'+'11'.repeat(20)
 }]}),/Funding locking script differs from gift/);
 assert.throws(()=>review({...giftEvidence,verifiedOutputs:[{
  ...giftEvidence.verifiedOutputs[0],scriptPubKeyHex:undefined
 }]}),/Verified gift locking script required/);
});
