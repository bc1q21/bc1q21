import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {verifySameGiftExternalSignedReturn} from './same-gift-external-signed-return.mjs';
const p=new bitcoin.Psbt({network:bitcoin.networks.regtest});
p.setVersion(2);p.setLocktime(500);
p.addInput({hash:'aa'.repeat(32),index:0,sequence:0xfffffffe});
p.addOutput({script:Buffer.from('0014'+'22'.repeat(20),'hex'),value:11000});
const expected={network:'regtest',fundingTxid:'aa'.repeat(32),fundingVout:0,inputSats:12000,
 destinationScriptHex:'0014'+'22'.repeat(20),payoutSats:11000,locktime:500,
 signerPubkeyHex:'02'+'11'.repeat(32),redeemScriptHex:'01f4b1752102'+'11'.repeat(32)+'ac'};
const approval={recipientAuthenticated:false,transactionIntentApproved:false,walletOriginAttested:false,fundingEvidenceCurrent:false};
test('same-gift unsigned transaction and synthetic recipient never acquire signing or broadcast approval',()=>{
 assert.throws(()=>verifySameGiftExternalSignedReturn({unsignedPsbtBase64:p.toBase64(),signedPsbtBase64:p.toBase64(),expected,approval}),/Independent recipient\/intent\/funding approvals required/);
});
test('missing signed return cannot pass even if caller forges every approval boolean',()=>{
 assert.throws(()=>verifySameGiftExternalSignedReturn({unsignedPsbtBase64:p.toBase64(),signedPsbtBase64:p.toBase64(),expected,
  approval:{recipientAuthenticated:true,transactionIntentApproved:true,walletOriginAttested:true,fundingEvidenceCurrent:true}}),/no signing material/);
});
test('wrong gift and missing expected audit fields fail closed',()=>{
 assert.throws(()=>verifySameGiftExternalSignedReturn({unsignedPsbtBase64:p.toBase64(),signedPsbtBase64:'',expected:{...expected,fundingTxid:'bb'.repeat(32)},approval}),/Independent recipient/);
 assert.throws(()=>verifySameGiftExternalSignedReturn({unsignedPsbtBase64:p.toBase64(),signedPsbtBase64:'',expected:{network:'regtest'},approval}),/fields missing/);
});
