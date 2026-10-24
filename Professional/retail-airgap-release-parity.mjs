// Professional isolated adapter: ensure an offline unsigned PSBT preserves
// retail's approved single-output CLTV release intent. No signer, keys or broadcast.
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';

export function checkRetailAirgapReleaseParity({unsignedPsbtBase64,retailIntent}) {
 assert.equal(retailIntent?.network,'regtest','Regtest only');
 assert.ok(typeof unsignedPsbtBase64==='string'&&unsignedPsbtBase64.length<200000,'Unsigned PSBT required');
 const p=bitcoin.Psbt.fromBase64(unsignedPsbtBase64,{network:bitcoin.networks.regtest});
 assert.equal(p.txInputs.length,1,'Expected one release input');
 assert.equal(p.txOutputs.length,1,'Expected one release destination');
 const input=p.txInputs[0],output=p.txOutputs[0];
 const txid=Buffer.from(input.hash).reverse().toString('hex');
 assert.equal(txid,retailIntent.fundingTxid,'Retail funding outpoint changed');
 assert.equal(input.index,retailIntent.fundingVout,'Retail funding output changed');
 assert.equal(output.script.toString('hex'),retailIntent.destinationScriptHex,'Retail release destination changed');
 assert.equal(output.value,retailIntent.payoutSats,'Retail payout amount changed');
 const fee=retailIntent.inputSats-output.value;
 assert.ok(Number.isSafeInteger(fee)&&fee>=0&&fee<=100000,'Retail release fee invalid');
 assert.equal(fee,retailIntent.feeSats,'Retail release fee changed');
 assert.equal(p.locktime,retailIntent.locktime,'Retail release locktime changed');
 assert.ok(input.sequence<0xffffffff,'CLTV input must be non-final');
 assert.equal(p.data.inputs[0]?.redeemScript?.toString('hex'),retailIntent.redeemScriptHex,
  'Retail CLTV script changed');
 assert.ok(!p.data.inputs[0]?.partialSig?.length&&!p.data.inputs[0]?.finalScriptSig,
  'Expected unsigned transaction only');
 return Object.freeze({network:'regtest',retailIntentPreserved:true,
  signingMethod:'offline-psbt-qr',signed:false,broadcast:false,
  hardwareWalletOwnershipProven:false});
}
