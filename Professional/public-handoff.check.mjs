import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import { verifyProfessionalPublicHandoff } from './public-handoff.mjs';
const pub='032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd';
const locktime=110;
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
 bitcoin.opcodes.OP_DROP,Buffer.from(pub,'hex'),bitcoin.opcodes.OP_CHECKSIG]);
const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const valid={version:1,network:'regtest',signerPubkeyHex:pub,locktime,
 redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address};
test('public-only handoff verifies independently derived funding address',()=>{
 const r=verifyProfessionalPublicHandoff(valid);
 assert.equal(r.fundingAddress,payment.address);
 assert.equal(r.fundingScriptPubKeyHex,payment.output.toString('hex'));
 assert.equal(r.secretsReceived,false);
});
test('handoff rejects seed words, private keys and any extra field',()=>{
 for(const field of ['seed','mnemonic','privateKey','wif','xprv','notes']){
  assert.throws(()=>verifyProfessionalPublicHandoff({...valid,[field]:'synthetic'}),/Unexpected field/);
 }
});
test('handoff rejects tampered funding address, script, signer, locktime',()=>{
 for(const patch of [
  {fundingAddress:'2NnotAnAddress'}, {redeemScriptHex:'51'},
  {signerPubkeyHex:'02'+'00'.repeat(32)}, {locktime:111},
  {network:'bitcoin'}, {version:2}
 ]) assert.throws(()=>verifyProfessionalPublicHandoff({...valid,...patch}));
});
test('handoff requires every expected field',()=>{
 for(const field of Object.keys(valid)){
  const copy={...valid};delete copy[field];
  assert.throws(()=>verifyProfessionalPublicHandoff(copy));
 }
});

test('retail-compatible timestamp CLTV public handoff validates without private material',()=>{
 const timestamp=1798761600;
 const script=bitcoin.script.compile([bitcoin.script.number.encode(timestamp),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
  bitcoin.opcodes.OP_DROP,Buffer.from(pub,'hex'),bitcoin.opcodes.OP_CHECKSIG]);
 const address=bitcoin.payments.p2sh({redeem:{output:script},network:bitcoin.networks.regtest}).address;
 const result=verifyProfessionalPublicHandoff({...valid,locktime:timestamp,redeemScriptHex:script.toString('hex'),fundingAddress:address});
 assert.equal(result.locktime,timestamp);
 assert.equal(result.secretsReceived,false);
 assert.throws(()=>verifyProfessionalPublicHandoff({...valid,locktime:timestamp}));
});
