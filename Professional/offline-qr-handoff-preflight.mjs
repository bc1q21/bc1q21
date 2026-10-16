// bc1q21 Professional isolated Stage C PREPARATION ONLY.
// Reads a previously verified public-only regtest package, validates the exact
// unsigned PSBT, and prints a human-reviewable signing handoff. NEVER signs.
// No hardware access, seed/private keys, network calls or broadcasting.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import {verifyPortablePublicRegtestPackage} from './regtest-portable-public-package.mjs';
import {getCapturedJadeRegtestCltvHandoff} from './regtest-jade-public-fixture.mjs';

export async function inspectUnsignedOfflineHandoff(packageDir) {
 const verified=verifyPortablePublicRegtestPackage(packageDir);
 const e=JSON.parse(readFileSync(join(packageDir,'public-unsigned-cltv.json'),'utf8'));
 assert.equal(e.network,'regtest');assert.equal(e.signed,false);assert.equal(e.broadcast,false);
 const expected=await getCapturedJadeRegtestCltvHandoff(110);
 assert.equal(e.signerPubkeyHex,expected.publicHandoff.signerPubkeyHex);
 assert.equal(e.redeemScriptHex,expected.publicHandoff.redeemScriptHex);
 assert.equal(e.checkpoint.scriptPubKeyHex,expected.fundingScriptPubKeyHex);
 const raw=Buffer.from(e.unsignedPsbtBase64,'base64');
 assert.equal(createHash('sha256').update(raw).digest('hex'),e.unsignedPsbtSha256);
 const psbt=bitcoin.Psbt.fromBuffer(raw,{network:bitcoin.networks.regtest});
 assert.equal(psbt.version,2);
 assert.equal(psbt.locktime,110);
 assert.equal(psbt.txInputs.length,1);assert.equal(psbt.txOutputs.length,1);
 assert.equal(psbt.txInputs[0].sequence,0xfffffffe);
 assert.equal(Buffer.from(psbt.txInputs[0].hash).reverse().toString('hex'),e.checkpoint.fundingTxid);
 assert.equal(psbt.txInputs[0].index,e.checkpoint.vout);
 assert.equal(psbt.txOutputs[0].value,99000);
 assert.equal(Buffer.from(psbt.txOutputs[0].script).toString('hex'),e.destinationScriptHex);
 const i=psbt.data.inputs[0];
 assert.deepEqual(Object.keys(i).sort(),['nonWitnessUtxo','redeemScript','bip32Derivation'].sort(),
  'Unexpected input fields, signatures or proprietary data');
 assert.deepEqual(Object.keys(psbt.data.globalMap).sort(),['unsignedTx'].sort(),
  'Unexpected global PSBT metadata');
 assert.deepEqual(Object.keys(psbt.data.outputs[0]),[],'Unexpected output PSBT metadata');
 assert.equal(i.bip32Derivation.length,1);
 assert.equal(Buffer.from(i.bip32Derivation[0].pubkey).toString('hex'),e.signerPubkeyHex);
 assert.equal(Buffer.from(i.bip32Derivation[0].masterFingerprint).toString('hex'),expected.masterFingerprintHex);
 assert.deepEqual(i.bip32Derivation[0].path,
  'm/'+expected.derivationPath.map(n=>n>=0x80000000?(n-0x80000000)+"'":String(n)).join('/'));
 assert.equal(Buffer.from(i.redeemScript).toString('hex'),e.redeemScriptHex);
 assert.equal(Buffer.from(i.nonWitnessUtxo).toString('hex'),e.fundingTxHex);
 const funding=bitcoin.Transaction.fromHex(e.fundingTxHex);
 assert.equal(funding.getId(),e.checkpoint.fundingTxid);
 assert.equal(funding.outs[e.checkpoint.vout].value,100000);
 assert.equal(Buffer.from(funding.outs[e.checkpoint.vout].script).toString('hex'),e.checkpoint.scriptPubKeyHex);
 assert.equal(e.inputSats,100000);assert.equal(e.outputSats,99000);assert.equal(e.feeSats,1000);
 const address=bitcoin.address.fromOutputScript(psbt.txOutputs[0].script,bitcoin.networks.regtest);
 assert.ok(address.startsWith('bcrt1'),'Expected only regtest destination');
 const review=Object.freeze({
  status:'PREPARED_NOT_SIGNED',network:'regtest',fundingOutpoint:e.checkpoint.fundingTxid+':'+e.checkpoint.vout,
  fundingSats:100000,recipientAddress:address,recipientSats:99000,feeSats:1000,
  cltvBlockHeight:110,transactionLocktime:psbt.locktime,inputSequence:psbt.txInputs[0].sequence,
  signerPubkeyHex:e.signerPubkeyHex,signerMasterFingerprint:expected.masterFingerprintHex,
  signerDerivationPath:i.bip32Derivation[0].path,psbtSha256:e.unsignedPsbtSha256,
  psbtBytes:raw.length,portablePackageFiles:verified.fileCount,
  signed:false,broadcast:false,
  warning:'Public-only disposable regtest test; hardware OFF; NOT for real Bitcoin'
 });
 return Object.freeze({review,unsignedPsbtBase64:e.unsignedPsbtBase64});
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const dir=process.argv[2];
 if(!dir)throw Error('Usage: node offline-qr-handoff-preflight.mjs <verified-package-directory>');
 const {review}=await inspectUnsignedOfflineHandoff(dir);
 console.log('PASS_OFFLINE_QR_HANDOFF_PREFLIGHT: strict unsigned regtest PSBT and recipient review',JSON.stringify(review));
 // Do not print the PSBT by default: explicit human review and separate offline QR design remain pending.
}
