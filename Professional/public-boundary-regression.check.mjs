// Strict public-only Professional handoff boundary: no seed, key, or unexpected fields.
// Regtest fixture only. No network, signing, or broadcast.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { verifyProfessionalPublicHandoff } from './public-handoff.mjs';
import { prepareProfessionalReleaseFromPublicHandoff } from './public-funding-release-integration.mjs';

const key=Buffer.alloc(32);key[31]=9; // disposable public-key fixture only
const pub=Buffer.from(secp256k1.getPublicKey(key,true));
const locktime=110;
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
 bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pub,bitcoin.opcodes.OP_CHECKSIG]);
const p2sh=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const payload={version:1,network:'regtest',signerPubkeyHex:pub.toString('hex'),
 locktime,redeemScriptHex:redeem.toString('hex'),fundingAddress:p2sh.address};
const validated=verifyProfessionalPublicHandoff(JSON.parse(JSON.stringify(payload)));
assert.equal(validated.secretsReceived,false);
assert.equal(validated.fundingAddress,payload.fundingAddress);
assert.equal(validated.fundingScriptPubKeyHex,p2sh.output.toString('hex'));
assert.equal(JSON.stringify(payload).includes(key.toString('hex')),false);
const forbidden=['mnemonic','seed','seedPhrase','privateKey','privateKeyHex','wif',
 'xprv','signingKey','password','passphrase','secret','secretKey','entropy'];
for(const name of forbidden){
 const tampered={...payload,[name]:'disposable-secret-fixture'};
 assert.throws(()=>verifyProfessionalPublicHandoff(tampered),/Unexpected field/,'Reject '+name);
}
for(const [name,value] of [['network','mainnet'],['locktime',111],['fundingAddress','2invalid'],
 ['redeemScriptHex','51'],['signerPubkeyHex','02'+'00'.repeat(32)]]){
 assert.throws(()=>verifyProfessionalPublicHandoff({...payload,[name]:value}),'Reject modified '+name);
}
const fundingKey=Buffer.alloc(32);fundingKey[31]=3;
const fundingTx=new bitcoin.Transaction();
fundingTx.version=2;
fundingTx.addInput(Buffer.alloc(32,1),0,0xffffffff);
fundingTx.addOutput(p2sh.output,100000);
const fundingTxHex=fundingTx.toHex();
const destPub=Buffer.from(secp256k1.getPublicKey(fundingKey,true));
const dest=bitcoin.payments.p2wpkh({pubkey:destPub,network:bitcoin.networks.regtest});
const funding={fundingTxHex,vout:0,expectedTxid:fundingTx.getId(),expectedSats:100000,
 masterFingerprintHex:'00000009',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:dest.output.toString('hex'),destinationSats:99000};
const release=prepareProfessionalReleaseFromPublicHandoff(payload,funding);
assert.equal(release.signed,false);
assert.equal(release.broadcast,false);
assert.equal(release.fundingAddress,payload.fundingAddress);
assert.ok(release.unsignedPsbtBase64.length>100);
const psbt=bitcoin.Psbt.fromBase64(release.unsignedPsbtBase64);
assert.equal(psbt.txInputs.length,1);
assert.equal(psbt.data.inputs[0].redeemScript.toString('hex'),redeem.toString('hex'));
assert.equal(psbt.data.inputs[0].nonWitnessUtxo.toString('hex'),fundingTxHex);
for(const name of forbidden){
 assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(payload,{...funding,[name]:'fixture'}),/approved public funding details/,'Reject funding '+name);
}
for(const name of Object.keys(funding)){
 const copy={...funding};delete copy[name];
 assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(payload,copy),/approved public funding details/,'Require '+name);
}
const before=JSON.stringify(payload);
verifyProfessionalPublicHandoff(payload);
assert.equal(JSON.stringify(payload),before,'Validation must not mutate input');
console.log('PASS: strict public handoff and release funding allowlists, cross-field integrity, no secret fields, no signing/broadcast');
