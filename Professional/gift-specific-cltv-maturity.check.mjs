import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {inspectGiftSpecificCltvMaturity} from './gift-specific-cltv-maturity.mjs';
const pub=Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd','hex');
const locktime=110;
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pub,bitcoin.opcodes.OP_CHECKSIG]);
const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:pub.toString('hex'),locktime,redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address};
const tx=new bitcoin.Transaction();tx.version=2;tx.addInput(Buffer.alloc(32,1),0);tx.addOutput(payment.output,100000);
const funding={fundingTxHex:tx.toHex(),vout:0,expectedTxid:tx.getId(),expectedSats:100000,masterFingerprintHex:'e29ac13c',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000};
const checkpoint={version:1,chain:'regtest',fundingTxid:tx.getId(),vout:0,amountSats:100000,scriptPubKeyHex:payment.output.toString('hex'),fundingBlockHash:'b'.repeat(64),fundingBlockHeight:100};
const evidence={chainInfo:{chain:'regtest'},transaction:{txid:tx.getId(),blockhash:checkpoint.fundingBlockHash,vout:[{n:0,value:0.001,scriptPubKey:{hex:checkpoint.scriptPubKeyHex}}]},blockHeader:{hash:checkpoint.fundingBlockHash,height:100,confirmations:2},txout:{value:0.001,confirmations:2,scriptPubKey:{hex:checkpoint.scriptPubKeyHex}}};
const url='https://example.invalid/gift/'+payment.address;
const tip=blocks=>({chain:'regtest',blocks,bestblockhash:'c'.repeat(64)});
for(const [blocks,mature] of [[108,false],[109,false],[110,true],[111,true]]) {
 const result=inspectGiftSpecificCltvMaturity(url,handoff,funding,checkpoint,evidence,tip(blocks));
 assert.equal(result.cltvMatureForNextBlock,mature);
 for(const k of ['chainTipSourceVerified','authenticated','scheduleUnlocked','canConstructRelease','canSign','canBroadcast']) assert.equal(result[k],false);
}
assert.throws(()=>inspectGiftSpecificCltvMaturity(url,handoff,funding,checkpoint,evidence,tip(99)));
assert.throws(()=>inspectGiftSpecificCltvMaturity(url,handoff,funding,checkpoint,evidence,{...tip(110),chain:'main'}));
assert.throws(()=>inspectGiftSpecificCltvMaturity(url,handoff,funding,checkpoint,evidence,{...tip(110),bestblockhash:'invalid'}));
console.log('PASS — CLTV maturity boundaries are checked without recipient authorization');
