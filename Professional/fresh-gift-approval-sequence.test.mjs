import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {prepareFreshGiftApprovalSequence} from './fresh-gift-approval-sequence.mjs';

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
const rpcFor=({spent=false,moving=false}={})=>{
 let reads=0;
 return async method=>{
  if(method==='getbestblockhash')return moving&&++reads>=4?'b'.repeat(64):tip;
  if(method==='getblockchaininfo')return {chain:'regtest',bestblockhash:tip,blocks:110};
  if(method==='getblockheader')return {hash:tip,height:110,mediantime:1800000000};
  if(method==='gettxout')return spent?null:{bestblock:tip,confirmations:2,value:0.001,scriptPubKey:{hex:payment.output.toString('hex')}};
  throw Error('Unexpected RPC');
 };
};
const make=rpc=>prepareFreshGiftApprovalSequence({
 rpc,giftEvidence,releaseIndex:0,publicHandoff:handoff,funding,approvedIntent:intent
});

test('one-time beneficiary approval and fresh outpoint pass without QR permission',async()=>{
 const flow=await make(rpcFor());
 assert.equal(flow.review().explicitlyApproved,false);
 flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
 const result=await flow.finalizeApproval();
 assert.equal(result.freshOutpointMatched,true);
 assert.equal(result.approvalConsumed,true);
 assert.equal(result.canExportSigningQr,false);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
 await assert.rejects(flow.finalizeApproval(),/already consumed/);
});

test('spent outpoint invalidates approval and cannot be retried',async()=>{
 const flow=await make(rpcFor({spent:true}));
 flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
 await assert.rejects(flow.finalizeApproval(),/spent or tip changed/);
 await assert.rejects(flow.finalizeApproval(),/already consumed/);
});

test('changing Core tip after approval invalidates the entire sequence',async()=>{
 const flow=await make(rpcFor({moving:true}));
 flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
 await assert.rejects(flow.finalizeApproval(),/Chain tip changed/);
 await assert.rejects(flow.finalizeApproval(),/already consumed/);
});

test('no approval cannot be finalized or subsequently reused',async()=>{
 const flow=await make(rpcFor());
 await assert.rejects(flow.finalizeApproval(),/Explicit fingerprint approval required/);
 await assert.rejects(flow.finalizeApproval(),/already consumed/);
});

test('two simultaneous finalization attempts cannot consume approval twice',async()=>{
 let unblock;
 let waiting=false;
 const gate=new Promise(resolve=>{unblock=resolve;});
 const base=rpcFor();
 const rpc=async(method,params)=>{
  if(method==='getbestblockhash'&&!waiting){
   waiting=true;
   await gate;
  }
  return base(method,params);
 };
 const flow=await make(rpc);
 flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
 const first=flow.finalizeApproval();
 await assert.rejects(flow.finalizeApproval(),/already consumed/);
 unblock();
 const result=await first;
 assert.equal(result.approvalConsumed,true);
 assert.equal(result.canExportSigningQr,false);
});

test('rejected fresh Core check cannot be recovered by reapproving same session',async()=>{
 const flow=await make(rpcFor({spent:true}));
 flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
 await assert.rejects(flow.finalizeApproval(),/spent or tip changed/);
 assert.throws(()=>flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256}),
  /already consumed/);
 await assert.rejects(flow.finalizeApproval(),/already consumed/);
});
