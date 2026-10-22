import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {prepareBeneficiaryGiftApprovalWithCore} from './beneficiary-gift-approval-core-flow.mjs';
const pub=n=>Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),n]),true));
const signer=pub(9),locktime=110;
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
const tip='a'.repeat(64);
const giftEvidence={network:'regtest',outputsConsistent:true,tipStableDuringRead:true,
 observedTip:tip,fundingTxid:tx.getId(),releaseCount:1,
 verifiedOutputs:[{index:0,txid:tx.getId(),vout:0,sats:100000}]};
const rpc=(height=110)=>async method=>{
 if(method==='getbestblockhash')return tip;
 if(method==='getblockchaininfo')return {chain:'regtest',bestblockhash:tip,blocks:height};
 if(method==='getblockheader')return {hash:tip,height,mediantime:1800000000};
 throw Error('Unexpected RPC');
};
const make=(height=110,approvedIntent=intent)=>prepareBeneficiaryGiftApprovalWithCore({
 rpc:rpc(height),giftEvidence,releaseIndex:0,publicHandoff:handoff,funding,approvedIntent
});

test('exact mature gift approval is one-time and never grants QR export',async()=>{
 const flow=await make();
 const digest=flow.review().psbtSha256;
 assert.equal(flow.review().canExportSigningQr,false);
 assert.throws(()=>flow.recordApproval(),/Explicit fingerprint approval required/);
 assert.throws(()=>flow.approve({acknowledged:true,confirmedDigest:'b'.repeat(64)}),/fingerprint/);
 flow.approve({acknowledged:true,confirmedDigest:digest});
 const receipt=flow.recordApproval();
 assert.equal(receipt.approvalRecorded,true);
 assert.equal(receipt.beneficiaryAuthorized,false);
 assert.equal(receipt.canExportSigningQr,false);
 assert.equal(receipt.canSign,false);
 assert.throws(()=>flow.recordApproval(),/already consumed/);
 assert.throws(()=>flow.approve({acknowledged:true,confirmedDigest:digest}),/already consumed/);
});

test('immature and modified transaction cannot reach approval',async()=>{
 await assert.rejects(make(109),/not mature/);
 await assert.rejects(make(110,{...intent,destinationSats:98000}),/Approval mismatch: destinationSats/);
});
