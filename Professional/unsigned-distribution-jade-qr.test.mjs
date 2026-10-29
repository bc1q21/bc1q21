import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {snapshotFundedDistributionIntent} from './funded-distribution-intent.mjs';
import {buildUnsignedFundedDistributionPsbt} from './unsigned-funded-distribution-psbt.mjs';
import {makeUnsignedDistributionJadeQr} from './unsigned-distribution-jade-qr.mjs';
const pubkey='0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const script=bitcoin.payments.p2wpkh({pubkey:Buffer.from(pubkey,'hex'),
 network:bitcoin.networks.regtest}).output.toString('hex');
const date='2030-01-01',locktime=Date.parse(date+'T00:00:00Z')/1000;
function unsigned(){
 const intent=snapshotFundedDistributionIntent({
  network:'regtest',
  plan:{format:'bc1q21-professional-retail-plan-preview-v1',
   status:'UNFUNDED_PREVIEW_NOT_SIGNABLE',releases:[{date,amountSats:12000}],totalSats:12000},
  utxos:[{txid:'ab'.repeat(32),vout:1,valueSats:15000,scriptPubKeyHex:script}],
  giftOutputs:[{date,locktime,valueSats:12000,scriptPubKeyHex:'a914'+'11'.repeat(20)+'87'}],
  changeOutput:{valueSats:2000,scriptPubKeyHex:script},networkFeeSats:1000
 });
 return buildUnsignedFundedDistributionPsbt(intent,{
  masterFingerprintHex:'e29ac13c',publicKeyHex:pubkey,path:"m/84'/0'/0'/0/0"
 });
}
test('funded public intent to unsigned PSBT to Jade crypto-psbt QR frames',()=>{
 const result=makeUnsignedDistributionJadeQr(unsigned(),{fragmentLength:120,frameCount:24});
 assert.equal(result.frameCount,24);
 assert.ok(result.frames.every(f=>f.startsWith('ur:crypto-psbt/')));
 assert.equal(result.signed,false);
 assert.equal(result.broadcast,false);
});
test('rejects modified unsigned PSBT, changed hash and signed flags',()=>{
 const base=unsigned();
 for(const modified of [
  {...base,psbtSha256:'00'.repeat(32)},
  {...base,network:'mainnet'},
  {...base,signed:true},
  {...base,hardwareSignatureVerified:true},
  {...base,unsignedPsbtBase64:base.unsignedPsbtBase64.slice(0,-4)+'AAAA'}
 ]) assert.throws(()=>makeUnsignedDistributionJadeQr(modified));
});
