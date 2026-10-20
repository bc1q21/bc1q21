import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {createHash} from 'node:crypto';
import {auditSameGiftUnsignedHandoff} from './audit-same-gift-unsigned-handoff.mjs';
const pub=Buffer.concat([Buffer.from('02','hex'),Buffer.alloc(32,1)]);
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(500),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pub,bitcoin.opcodes.OP_CHECKSIG]);
const out=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest}).output;
const prev=new bitcoin.Transaction();prev.version=2;prev.addInput(Buffer.alloc(32,3),0);prev.addOutput(out,12000);
const psbt=new bitcoin.Psbt({network:bitcoin.networks.regtest});psbt.setVersion(2);psbt.setLocktime(500);
psbt.addInput({hash:prev.getId(),index:0,sequence:0xfffffffe,nonWitnessUtxo:prev.toBuffer(),redeemScript:redeem});
psbt.addOutput({script:Buffer.from('0014'+'22'.repeat(20),'hex'),value:11000});
const base=psbt.toBase64();
const m={format:'bc1q21-professional-same-gift-unsigned-handoff-v1',network:'regtest',
 publicOnly:true,disposableFixture:true,recipientAuthenticated:false,walletOriginAttested:false,
 recipientIntentApproved:false,signingAuthorized:false,broadcastAuthorized:false,
 fundingTxid:prev.getId(),vout:0,chainTipHash:'a'.repeat(64),locktime:500,nextBlockHeight:501,
 psbtSha256:createHash('sha256').update(Buffer.from(base,'base64')).digest('hex'),
 unsignedPsbtBase64:base,payoutSats:11000,inputSats:12000,feeSats:1000,
 redeemScriptHex:redeem.toString('hex'),destinationScriptHex:'0014'+'22'.repeat(20)};
test('offline audit validates exact unsigned outpoint, fee and script while withholding authority',()=>{
 const a=auditSameGiftUnsignedHandoff(m);assert.equal(a.exactUnsignedPsbtVerified,true);assert.equal(a.canBroadcast,false);
});
test('offline audit rejects forged approval, PSBT change, mismatched funding and premature release',()=>{
 for(const changed of [
  {...m,recipientAuthenticated:true},{...m,broadcastAuthorized:true},
  {...m,psbtSha256:'b'.repeat(64)},{...m,fundingTxid:'c'.repeat(64)},
  {...m,vout:5},{...m,nextBlockHeight:500},{...m,feeSats:1001}
 ]) assert.throws(()=>auditSameGiftUnsignedHandoff(changed));
});
