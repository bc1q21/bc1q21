import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {snapshotFundedDistributionIntent} from './funded-distribution-intent.mjs';
import {buildUnsignedFundedDistributionPsbt} from './unsigned-funded-distribution-psbt.mjs';
import {inspectFundedGiftUnsignedTransaction} from './inspect-funded-gift-unsigned.mjs';
const key='0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const fundingScript=bitcoin.payments.p2wpkh({pubkey:Buffer.from(key,'hex'),network:bitcoin.networks.regtest}).output.toString('hex');
const date='2030-01-01',locktime=Date.parse(date+'T00:00:00Z')/1000;
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
 bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,Buffer.from(key,'hex'),bitcoin.opcodes.OP_CHECKSIG]);
const giftScript=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest}).output.toString('hex');
const plan={format:'bc1q21-professional-retail-plan-preview-v1',status:'UNFUNDED_PREVIEW_NOT_SIGNABLE',
 releases:[{date,amountSats:12000}],totalSats:12000};
const intent=snapshotFundedDistributionIntent({network:'regtest',plan,
 utxos:[{txid:'ab'.repeat(32),vout:0,valueSats:15000,scriptPubKeyHex:fundingScript}],
 giftOutputs:[{date,locktime,valueSats:12000,scriptPubKeyHex:giftScript}],
 changeOutput:{valueSats:2000,scriptPubKeyHex:fundingScript},networkFeeSats:1000});
const signer={masterFingerprintHex:'e29ac13c',publicKeyHex:key,path:"m/84'/0'/0'/0/0"};
const unsigned=buildUnsignedFundedDistributionPsbt(intent,signer);
const observations=[{txid:intent.inputs[0].txid,vout:0,response:{
 value:0.00015,confirmations:3,scriptPubKey:{hex:fundingScript}}}];
const args={intent,plan,recipientPublicKeys:[key],observations,unsigned};
test('binds all proposed inputs, outputs, CLTV scripts and PSBT without authorizing Jade',()=>{
 const result=inspectFundedGiftUnsignedTransaction(args);
 assert.equal(result.unsignedTransactionMatchesSuppliedIntent,true);
 assert.equal(result.approvedPsbtSha256,unsigned.psbtSha256);
 assert.equal(result.recipientKeyOriginAuthenticated,false);
 assert.equal(result.rpcProvenanceVerified,false);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
});
test('rejects swapped recipient, forged UTXO and tampered unsigned PSBT',()=>{
 assert.throws(()=>inspectFundedGiftUnsignedTransaction({...args,recipientPublicKeys:['03'+key.slice(2)]}));
 assert.throws(()=>inspectFundedGiftUnsignedTransaction({...args,observations:[{...observations[0],response:{...observations[0].response,value:0.00016}}]}));
 assert.throws(()=>inspectFundedGiftUnsignedTransaction({...args,unsigned:{...unsigned,psbtSha256:'00'.repeat(32)}}));
 assert.throws(()=>inspectFundedGiftUnsignedTransaction({...args,unsigned:{...unsigned,networkFeeSats:999}}));
 assert.throws(()=>inspectFundedGiftUnsignedTransaction({...args,intent:{...intent,change:{...intent.change,valueSats:1999}}}));
});
