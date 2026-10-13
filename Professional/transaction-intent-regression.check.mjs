// Independent transaction-intent regression for unsigned Professional PSBT.
// The caller MUST approve the intended destination and exact satoshi amount separately.
// This verifies the builder preserves that intent; it does not provide human approval UI.
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { prepareProfessionalReleaseFromPublicHandoff } from './public-funding-release-integration.mjs';
const fixturePub=n=>Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),n]),true));
const signer=fixturePub(9);
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(110),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
 bitcoin.opcodes.OP_DROP,signer,bitcoin.opcodes.OP_CHECKSIG]);
const fundingPayment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:signer.toString('hex'),locktime:110,
 redeemScriptHex:redeem.toString('hex'),fundingAddress:fundingPayment.address};
const prev=new bitcoin.Transaction();
prev.version=2;prev.addInput(Buffer.alloc(32,1),0);prev.addOutput(fundingPayment.output,100000);
const destination=bitcoin.payments.p2wpkh({pubkey:fixturePub(10),network:bitcoin.networks.regtest});
const attacker=bitcoin.payments.p2wpkh({pubkey:fixturePub(11),network:bitcoin.networks.regtest});
const details={fundingTxHex:prev.toHex(),vout:0,expectedTxid:prev.getId(),expectedSats:100000,
 masterFingerprintHex:'00000009',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:destination.output.toString('hex'),destinationSats:99000};
function parse(funding){
 const result=prepareProfessionalReleaseFromPublicHandoff(handoff,funding);
 const psbt=bitcoin.Psbt.fromBase64(result.unsignedPsbtBase64);
 assert.equal(psbt.txInputs.length,1);
 assert.equal(psbt.txOutputs.length,1);
 assert.equal(psbt.locktime,110);
 assert.equal(psbt.txInputs[0].sequence,0xfffffffe);
 assert.equal(psbt.txInputs[0].hash.toString('hex'),Buffer.from(prev.getHash()).toString('hex'));
 assert.equal(psbt.txInputs[0].index,0);
 assert.equal(psbt.data.inputs[0].redeemScript.toString('hex'),redeem.toString('hex'));
 return {result,psbt};
}
const expected=parse(details);
assert.equal(expected.psbt.txOutputs[0].script.toString('hex'),details.destinationScriptHex);
assert.equal(expected.psbt.txOutputs[0].value,details.destinationSats);
assert.equal(100000-expected.psbt.txOutputs[0].value,1000);
assert.equal(expected.result.signed,false);
assert.equal(expected.result.broadcast,false);
// Changing an untrusted caller's requested destination or amount must NOT be
// interpreted as proof of user intent. A trusted approval gate is needed.
const redirected=parse({...details,destinationScriptHex:attacker.output.toString('hex')});
assert.equal(redirected.psbt.txOutputs[0].script.toString('hex'),attacker.output.toString('hex'));
assert.notEqual(redirected.result.unsignedPsbtBase64,expected.result.unsignedPsbtBase64);
const reduced=parse({...details,destinationSats:98000});
assert.equal(reduced.psbt.txOutputs[0].value,98000);
assert.notEqual(reduced.result.unsignedPsbtBase64,expected.result.unsignedPsbtBase64);
// Approval gate compares the actual parsed unsigned PSBT against independently
// approved immutable intent, rather than trusting the builder's summary.
function verifyAgainstApprovedIntent(psbt,approved){
 if(psbt.txInputs.length!==1||psbt.txOutputs.length!==1)throw Error('Unexpected input/output count');
 if(!psbt.txOutputs[0].script.equals(Buffer.from(approved.destinationScriptHex,'hex')))
  throw Error('Destination differs from approved intent');
 if(psbt.txOutputs[0].value!==approved.destinationSats)throw Error('Amount differs from approved intent');
 if(psbt.txInputs[0].sequence!==0xfffffffe||psbt.locktime!==110)throw Error('Timelock differs from approved intent');
 return true;
}
const approved=Object.freeze({destinationScriptHex:details.destinationScriptHex,destinationSats:details.destinationSats});
assert.equal(verifyAgainstApprovedIntent(expected.psbt,approved),true);
assert.throws(()=>verifyAgainstApprovedIntent(redirected.psbt,approved),/Destination differs/);
assert.throws(()=>verifyAgainstApprovedIntent(reduced.psbt,approved),/Amount differs/);
assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(handoff,{...details,destinationSats:100000}),/Invalid payout or fee/);
assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(handoff,{...details,destinationSats:1}),/Invalid payout or fee/);
assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(handoff,{...details,destinationSats:100}),/Invalid payout or fee/);
// With a 100,000-sat input, the maximum possible fee is under the 100,000-sat ceiling.
// Test the actual lower-bound safety rule instead of expecting an unreachable fee rejection.
assert.throws(()=>prepareProfessionalReleaseFromPublicHandoff(handoff,{...details,destinationSats:545}),/Invalid payout or fee/);
console.log('PASS: independent approved-intent check detects redirected destination and changed payout; no signing/broadcast');
