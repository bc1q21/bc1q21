// Actual disposable Jade signed synthetic PSBT fixture; no real funds or keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import { finalizeSyntheticCltvPsbt } from './finalize-synthetic-cltv.mjs';
import { deriveJadePublicCltvHandoff } from './jade-xpub-cltv-handoff.mjs';
import { prepareProfessionalReleaseFromPublicHandoff } from './public-funding-release-integration.mjs';
const signed=Buffer.from('cHNidP8BAFICAAAAAZqD+adOvhuhBKBYWo0la/WX+hlO1rjXUzWgp9WaKbcxAAAAAAD+////AbiCAQAAAAAAFgAUq6urq6urq6urq6urq6urq6urq6tuAAAAAAEAUwIAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAAAAP////8BoIYBAAAAAAAXqRSxdfCsmm/mfEwC7txzp3U6Z6TspocAAAAAIgIDJghXPJXiKsGy+0CU1f18eaPdiurLMpPmsSDcgw3u/71HMEQCIBYPuN/Zbpy3p/ivD4nujLGCy1gJxJB0mQjtR6p1go3LAiAhSaxKnYGZopUk0cIhXekbMY/YQZARKTpb5lXRrxmRlQEBBCcBbrF1IQMmCFc8leIqwbL7QJTV/Xx5o92K6ssyk+axINyDDe7/vawiBgMmCFc8leIqwbL7QJTV/Xx5o92K6ssyk+axINyDDe7/vRjimsE8VAAAgAAAAIAAAACAAQAAAAoAAAAAAA==','base64');
const original=bitcoin.Psbt.fromBuffer(signed);
delete original.data.inputs[0].partialSig;
const unsigned=original.toBase64();
const pubkey='032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd';
const finalize=raw=>finalizeSyntheticCltvPsbt(raw,unsigned,pubkey);
test('actual Jade synthetic signature finalizes to a legacy P2SH scriptSig',()=>{
 const result=finalize(signed);
 const tx=bitcoin.Transaction.fromHex(result.rawTransactionHex);
 assert.equal(tx.ins.length,1);
 assert.equal(tx.outs.length,1);
 assert.equal(tx.locktime,110);
 assert.equal(tx.ins[0].sequence,0xfffffffe);
 assert.equal(tx.ins[0].witness.length,0);
 const chunks=bitcoin.script.decompile(tx.ins[0].script);
 assert.equal(chunks.length,2);
 assert.ok(Buffer.isBuffer(chunks[0]));
 assert.equal(Buffer.from(chunks[1]).toString('hex'),original.data.inputs[0].redeemScript.toString('hex'));
 assert.equal(result.scriptExecutionVerified,false);
 assert.equal(result.broadcast,false);
});
test('tampered signature fails before finalization',()=>{
 const p=bitcoin.Psbt.fromBuffer(signed);
 const sig=Buffer.from(p.data.inputs[0].partialSig[0].signature);
 sig[10]^=1;
 p.data.inputs[0].partialSig[0].signature=sig;
 assert.throws(()=>finalize(p.toBuffer()));
});
test('changed transaction locktime is rejected',()=>{
 const p=bitcoin.Psbt.fromBuffer(signed);
 const unsignedTx=bitcoin.Transaction.fromBuffer(p.data.globalMap.unsignedTx.toBuffer());
 unsignedTx.locktime=111;
 p.data.globalMap.unsignedTx.tx=unsignedTx;
 assert.throws(()=>finalize(p.toBuffer()),/Unsigned transaction changed/);
});

test('Jade-derived Professional PSBT matches the previously Jade-signed unsigned transaction byte for byte',()=>{
 const h=deriveJadePublicCltvHandoff({
  accountXpub:'xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78',
  masterFingerprintHex:'e29ac13c',childIndex:10,locktime:110
 });
 const previous=bitcoin.Transaction.fromBuffer(original.data.inputs[0].nonWitnessUtxo);
 const handoff={version:h.version,network:h.network,signerPubkeyHex:h.signerPubkeyHex,locktime:h.locktime,
  redeemScriptHex:h.redeemScriptHex,fundingAddress:h.fundingAddress};
 const newResult=prepareProfessionalReleaseFromPublicHandoff(handoff,{
  fundingTxHex:previous.toHex(),vout:0,expectedTxid:previous.getId(),expectedSats:100000,
  masterFingerprintHex:h.masterFingerprintHex,derivationPath:h.derivationPath,
  destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000
 });
 const newlyBuilt=bitcoin.Psbt.fromBase64(newResult.unsignedPsbtBase64);
 assert.equal(newlyBuilt.data.inputs[0].redeemScript.toString('hex'),original.data.inputs[0].redeemScript.toString('hex'));
 assert.equal(newlyBuilt.data.inputs[0].bip32Derivation[0].pubkey.toString('hex'),pubkey);
 assert.equal(newlyBuilt.data.inputs[0].bip32Derivation[0].path,original.data.inputs[0].bip32Derivation[0].path);
 assert.equal(newlyBuilt.data.inputs[0].bip32Derivation[0].masterFingerprint.toString('hex'),
  original.data.inputs[0].bip32Derivation[0].masterFingerprint.toString('hex'));
 assert.equal(newResult.unsignedPsbtBase64,unsigned,
  'Exact unsigned PSBT bytes differ from the one Jade actually signed');
 assert.equal(newResult.signed,false);assert.equal(newResult.broadcast,false);
});
