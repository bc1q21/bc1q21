import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {snapshotFundedDistributionIntent} from './funded-distribution-intent.mjs';
import {verifyGiftCltvOutputs} from './verify-gift-cltv-outputs.mjs';
const key='0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const other='02c6047f9441ed7d6d3045406e95c07cd85aef4a3c4f9eecf10ef2a3b0db7b2d'; // deliberately invalid public key is rejected too
const date='2030-01-01', locktime=Date.parse(date+'T00:00:00Z')/1000;
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
 bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,Buffer.from(key,'hex'),bitcoin.opcodes.OP_CHECKSIG]);
const script=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest}).output.toString('hex');
const plan={format:'bc1q21-professional-retail-plan-preview-v1',
 status:'UNFUNDED_PREVIEW_NOT_SIGNABLE',releases:[{date,amountSats:12000}],totalSats:12000};
const intent=snapshotFundedDistributionIntent({
 network:'regtest',plan,
 utxos:[{txid:'ab'.repeat(32),vout:0,valueSats:15000,scriptPubKeyHex:'0014'+'11'.repeat(20)}],
 giftOutputs:[{date,locktime,valueSats:12000,scriptPubKeyHex:script}],
 changeOutput:{valueSats:2000,scriptPubKeyHex:'0014'+'11'.repeat(20)},networkFeeSats:1000
});
test('derives the exact CLTV output for the approved date and public key',()=>{
 const result=verifyGiftCltvOutputs({intent,plan,recipientPublicKeys:[key]});
 assert.equal(result.scriptsMatchSuppliedPublicKeysAndPlan,true);
 assert.equal(result.releases[0].scriptPubKeyHex,script);
 assert.equal(result.recipientKeyOriginAuthenticated,false);
 assert.equal(result.signingAuthorized,false);
});
test('rejects alternate recipient, script substitution and date tampering',()=>{
 assert.throws(()=>verifyGiftCltvOutputs({intent,plan,recipientPublicKeys:[other]}));
 assert.throws(()=>verifyGiftCltvOutputs({intent:{...intent,gifts:[{...intent.gifts[0],scriptPubKeyHex:'a914'+'22'.repeat(20)+'87'}]},plan,recipientPublicKeys:[key]}));
 assert.throws(()=>verifyGiftCltvOutputs({intent,plan:{...plan,releases:[{date:'2031-01-01',amountSats:12000}]},recipientPublicKeys:[key]}));
 assert.throws(()=>verifyGiftCltvOutputs({intent,plan,recipientPublicKeys:[]}));
});
test('rejects impossible calendar dates and altered locktimes',()=>{
 const badPlan={...plan,releases:[{date:'2030-02-30',amountSats:12000}]};
 assert.throws(()=>verifyGiftCltvOutputs({intent,plan:badPlan,recipientPublicKeys:[key]}));
 assert.throws(()=>verifyGiftCltvOutputs({intent:{...intent,gifts:[{...intent.gifts[0],locktime:locktime+1}]},plan,recipientPublicKeys:[key]}));
});
