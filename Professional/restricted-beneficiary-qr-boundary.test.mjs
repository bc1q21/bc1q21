import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {prepareRestrictedBeneficiaryQrBoundary} from './restricted-beneficiary-qr-boundary.mjs';

const pub=n=>Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),n]),true));
const signer=pub(9),locktime=110,tip='a'.repeat(64);
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
 bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,signer,bitcoin.opcodes.OP_CHECKSIG]);
const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:signer.toString('hex'),locktime,
 redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address};
const tx=new bitcoin.Transaction();tx.version=2;tx.addInput(Buffer.alloc(32,1),0);tx.addOutput(payment.output,100000);
const destination=bitcoin.payments.p2wpkh({pubkey:pub(10),network:bitcoin.networks.regtest});
const funding={fundingTxHex:tx.toHex(),vout:0,expectedTxid:tx.getId(),expectedSats:100000,
 masterFingerprintHex:'00000009',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:destination.output.toString('hex'),destinationSats:99000};
const intent={destinationScriptHex:funding.destinationScriptHex,destinationSats:99000,
 expectedTxid:funding.expectedTxid,vout:0,expectedSats:100000,locktime,
 signerPubkeyHex:handoff.signerPubkeyHex};
const giftEvidence={network:'regtest',outputsConsistent:true,tipStableDuringRead:true,
 observedTip:tip,fundingTxid:tx.getId(),releaseCount:1,
 verifiedOutputs:[{index:0,txid:tx.getId(),vout:0,sats:100000,scriptPubKeyHex:payment.output.toString('hex')}]};
const rpc=async method=>{
 if(method==='getbestblockhash')return tip;
 if(method==='getblockchaininfo')return {chain:'regtest',bestblockhash:tip,blocks:110};
 if(method==='getblockheader')return {hash:tip,height:110,mediantime:1800000000};
 if(method==='gettxout')return {bestblock:tip,confirmations:2,value:0.001,scriptPubKey:{hex:payment.output.toString('hex')}};
 throw Error('Unexpected RPC');
};

test('full beneficiary preflight produces no bypass to legacy QR export',async()=>{
 const flow=await prepareRestrictedBeneficiaryQrBoundary({
  rpc,giftEvidence,releaseIndex:0,publicHandoff:handoff,funding,approvedIntent:intent
 });
 assert.equal(typeof flow.exportQrFrames,'undefined');
 assert.equal(typeof flow.completeSignedReturn,'undefined');
 assert.equal(flow.canExportSigningQr,false);
 await assert.rejects(flow.finalizeReview(),/Explicit fingerprint approval required/);
 await assert.rejects(flow.finalizeReview(),/already finalized/);
});

test('exact approved review is one-time and remains non-signing',async()=>{
 const flow=await prepareRestrictedBeneficiaryQrBoundary({
  rpc,giftEvidence,releaseIndex:0,publicHandoff:handoff,funding,approvedIntent:intent
 });
 flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
 const result=await flow.finalizeReview();
 assert.equal(result.exactApprovedPsbtMatched,true);
 assert.equal(result.canExportSigningQr,false);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
 assert.equal(typeof flow.exportQrFrames,'undefined');
 await assert.rejects(flow.finalizeReview(),/already finalized/);
});
