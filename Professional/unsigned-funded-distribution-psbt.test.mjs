import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {snapshotFundedDistributionIntent} from './funded-distribution-intent.mjs';
import {buildUnsignedFundedDistributionPsbt} from './unsigned-funded-distribution-psbt.mjs';

const pubkey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const fundingScript = bitcoin.payments.p2wpkh({
  pubkey:Buffer.from(pubkey,'hex'),network:bitcoin.networks.regtest
}).output.toString('hex');
const date = '2030-01-01';
const locktime = Date.parse(date+'T00:00:00Z')/1000;
const giftScript = 'a914'+'11'.repeat(20)+'87';
const plan = {format:'bc1q21-professional-retail-plan-preview-v1',
  status:'UNFUNDED_PREVIEW_NOT_SIGNABLE',
  releases:[{date,amountSats:12000}],totalSats:12000};
const signer = {masterFingerprintHex:'e29ac13c',publicKeyHex:pubkey,path:"m/84'/0'/0'/0/0"};
function fixture() {
  return snapshotFundedDistributionIntent({
    network:'regtest',plan,
    utxos:[{txid:'ab'.repeat(32),vout:1,valueSats:15000,scriptPubKeyHex:fundingScript}],
    giftOutputs:[{date,locktime,valueSats:12000,scriptPubKeyHex:giftScript}],
    changeOutput:{valueSats:2000,scriptPubKeyHex:fundingScript},networkFeeSats:1000
  });
}
test('unsigned PSBT preserves gift, input, fee and Jade public derivation',()=>{
  const result=buildUnsignedFundedDistributionPsbt(fixture(),signer);
  const psbt=bitcoin.Psbt.fromBase64(result.unsignedPsbtBase64,{network:bitcoin.networks.regtest});
  assert.equal(psbt.txInputs.length,1);
  assert.equal(psbt.txOutputs.length,2);
  assert.equal(psbt.txOutputs[0].value,12000);
  assert.equal(psbt.txOutputs[0].script.toString('hex'),giftScript);
  assert.equal(psbt.data.inputs[0].bip32Derivation[0].path,signer.path);
  assert.equal(psbt.data.inputs[0].partialSig,undefined);
  assert.equal(result.networkFeeSats,1000);
  assert.equal(result.broadcast,false);
});
test('rejects incorrect public signer, funding key and tampered accounting',()=>{
  assert.throws(()=>buildUnsignedFundedDistributionPsbt(fixture(),
    {...signer,publicKeyHex:'03'+pubkey.slice(2)}));
  assert.throws(()=>buildUnsignedFundedDistributionPsbt(
    {...fixture(),inputs:[{...fixture().inputs[0],scriptPubKeyHex:'0014'+'00'.repeat(20)}]},signer));
  assert.throws(()=>buildUnsignedFundedDistributionPsbt(
    {...fixture(),networkFeeSats:999},signer));
  assert.throws(()=>buildUnsignedFundedDistributionPsbt(fixture(),
    {...signer,path:"m/84'/0'/0'/0/0;evil"}));
});
