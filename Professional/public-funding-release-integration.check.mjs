import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import { prepareProfessionalReleaseFromPublicHandoff } from './public-funding-release-integration.mjs';
const sha=(alg,b)=>createHash(alg).update(b).digest();
const pub=Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd','hex');
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(110),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
 bitcoin.opcodes.OP_DROP,pub,bitcoin.opcodes.OP_CHECKSIG]);
const p2sh=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:pub.toString('hex'),locktime:110,
 redeemScriptHex:redeem.toString('hex'),fundingAddress:p2sh.address};
const funding=new bitcoin.Transaction();funding.version=2;
funding.addInput(Buffer.alloc(32,1),0);funding.addOutput(p2sh.output,100000);
const details={fundingTxHex:funding.toHex(),vout:0,expectedTxid:funding.getId(),
 expectedSats:100000,masterFingerprintHex:'e29ac13c',
 derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000};
test('verified public wallet data flows into unsigned PSBT without secrets',()=>{
 const r=prepareProfessionalReleaseFromPublicHandoff(handoff,details);
 const psbt=bitcoin.Psbt.fromBase64(r.unsignedPsbtBase64);
 assert.equal(r.fundingAddress,p2sh.address);
 assert.equal(psbt.txInputs.length,1);
 assert.equal(psbt.txOutputs[0].value,99000);
 assert.equal(psbt.locktime,110);
 assert.equal(psbt.data.inputs[0].redeemScript.toString('hex'),redeem.toString('hex'));
 assert.equal(r.transactionSummary.feeSats,1000);
 assert.equal(r.nextEncoder,'ur:crypto-psbt');
 assert.equal(r.signed,false);assert.equal(r.broadcast,false);
});
test('public handoff rejects seed words and private keys',()=>{
 for(const extra of ['seed','mnemonic','privateKey','xprv']){
  assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff({...handoff,[extra]:'forbidden'},details));
  assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(handoff,{...details,[extra]:'forbidden'}));
 }
});
test('rejects tampered public funding address and funding output',()=>{
 assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff({...handoff,fundingAddress:'bad'},details));
 const bad=new bitcoin.Transaction();bad.version=2;bad.addInput(Buffer.alloc(32,1),0);
 bad.addOutput(Buffer.from('51','hex'),100000);
 assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(handoff,{
  ...details,fundingTxHex:bad.toHex(),expectedTxid:bad.getId()
 }));
});
test('rejects tampered amount, destination and fee safety violations',()=>{
 assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(handoff,{...details,expectedSats:99999}));
 assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(handoff,{...details,destinationSats:1}));
 assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(handoff,{...details,destinationScriptHex:'51'}));
});
