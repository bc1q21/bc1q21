import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {inspectRecipientReleaseReadiness} from './gift-specific-recipient-release-gate.mjs';
const pub=Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd','hex');
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(110),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pub,bitcoin.opcodes.OP_CHECKSIG]);
const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:pub.toString('hex'),locktime:110,redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address};
const tx=new bitcoin.Transaction();tx.version=2;tx.addInput(Buffer.alloc(32,1),0);tx.addOutput(payment.output,100000);
const funding={fundingTxHex:tx.toHex(),vout:0,expectedTxid:tx.getId(),expectedSats:100000,masterFingerprintHex:'e29ac13c',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000};
const checkpoint={version:1,chain:'regtest',fundingTxid:tx.getId(),vout:0,amountSats:100000,scriptPubKeyHex:payment.output.toString('hex'),fundingBlockHash:'b'.repeat(64),fundingBlockHeight:100};
const coreEvidence={chainInfo:{chain:'regtest'},transaction:{txid:tx.getId(),blockhash:checkpoint.fundingBlockHash,vout:[{n:0,value:0.001,scriptPubKey:{hex:checkpoint.scriptPubKeyHex}}]},blockHeader:{hash:checkpoint.fundingBlockHash,height:100,confirmations:2},txout:{value:0.001,confirmations:2,scriptPubKey:{hex:checkpoint.scriptPubKeyHex}}};
const base={url:'https://example.invalid/gift/'+payment.address,handoff,funding,checkpoint,coreEvidence};
for(const [height,mature] of [[109,false],[110,true],[120,true]]) {
 const result=inspectRecipientReleaseReadiness({...base,chainTip:{chain:'regtest',blocks:height,bestblockhash:'c'.repeat(64)}});
 assert.equal(result.maturityObserved,mature);
 assert.equal(result.ready,false);
 assert.equal(result.authorized,false);
 assert.equal(result.unsignedPsbt,null);
 assert.equal(result.signedPsbt,null);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
 assert.ok(result.blockers.length>=4);
}
console.log('PASS — maturity cannot bypass gift-specific recipient authorization');
