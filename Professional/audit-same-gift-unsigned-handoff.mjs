// Offline, public-only verification of the EXACT same-gift CI handoff.
// Regtest fixture only. No secrets, signing, node access or broadcast.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import bitcoin from 'bitcoinjs-lib';
import {checkRetailAirgapReleaseParity} from './retail-airgap-release-parity.mjs';
export function auditSameGiftUnsignedHandoff(m) {
 assert.ok(m&&m.format==='bc1q21-professional-same-gift-unsigned-handoff-v1'&&m.network==='regtest');
 assert.ok(m.publicOnly===true&&m.disposableFixture===true);
 for(const k of ['recipientAuthenticated','walletOriginAttested','recipientIntentApproved','signingAuthorized','broadcastAuthorized'])
  assert.equal(m[k],false,'Unsupported authorization claim: '+k);
 assert.match(m.fundingTxid,/^[a-f0-9]{64}$/);
 assert.match(m.psbtSha256,/^[a-f0-9]{64}$/);
 assert.match(m.chainTipHash,/^[a-f0-9]{64}$/);
 assert.ok(Number.isSafeInteger(m.nextBlockHeight)&&m.nextBlockHeight>m.locktime,'CLTV not mature for next block');
 const encoded=Buffer.from(m.unsignedPsbtBase64,'base64');
 assert.equal(encoded.toString('base64'),m.unsignedPsbtBase64,'Noncanonical PSBT');
 assert.equal(createHash('sha256').update(encoded).digest('hex'),m.psbtSha256,'PSBT digest mismatch');
 const p=bitcoin.Psbt.fromBuffer(encoded,{network:bitcoin.networks.regtest});
 assert.equal(p.txInputs.length,1);assert.equal(p.txOutputs.length,1);
 assert.equal(Buffer.from(p.txInputs[0].hash).reverse().toString('hex'),m.fundingTxid);
 assert.equal(p.txInputs[0].index,m.vout);
 assert.equal(p.txOutputs[0].value,m.payoutSats);
 assert.equal(Buffer.from(p.txOutputs[0].script).toString('hex'),m.destinationScriptHex);
 const tx=bitcoin.Transaction.fromBuffer(p.data.globalMap.unsignedTx.toBuffer());
 assert.equal(tx.locktime,m.locktime);
 assert.ok(tx.ins[0].sequence!==0xffffffff);
 assert.equal(p.data.inputs[0].partialSig,undefined);
 const prev=bitcoin.Transaction.fromBuffer(p.data.inputs[0].nonWitnessUtxo);
 assert.equal(prev.getId(),m.fundingTxid,'PSBT funding transaction mismatch');
 assert.equal(prev.outs[m.vout].value,m.inputSats);
 const redeem=p.data.inputs[0].redeemScript;
 assert.equal(Buffer.from(redeem).toString('hex'),m.redeemScriptHex);
 const script=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest}).output;
 assert.ok(prev.outs[m.vout].script.equals(script),'Funding redeem script mismatch');
 assert.equal(m.inputSats-m.payoutSats,m.feeSats);
 assert.ok(m.feeSats>=0&&m.feeSats<=100000);
 // The existing same-gift QR fixture must preserve retail's transaction intent.
 // This is an internal air-gap check, not an additional beneficiary step.
 checkRetailAirgapReleaseParity({unsignedPsbtBase64:m.unsignedPsbtBase64,retailIntent:{
  network:'regtest',fundingTxid:m.fundingTxid,fundingVout:m.vout,
  inputSats:m.inputSats,destinationScriptHex:m.destinationScriptHex,
  payoutSats:m.payoutSats,feeSats:m.feeSats,locktime:m.locktime,
  redeemScriptHex:m.redeemScriptHex
 }});
 return Object.freeze({network:'regtest',fundingTxid:m.fundingTxid,outpoint:m.vout,
  exactUnsignedPsbtVerified:true,creatorAuthenticated:false,recipientAuthenticated:false,
  signedReturnVerified:false,canSign:false,canBroadcast:false});
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const file=process.argv[2];assert.ok(file,'Expected handoff file');
 const result=auditSameGiftUnsignedHandoff(JSON.parse(readFileSync(file,'utf8')));
 console.log(JSON.stringify({result:'PASS_SAME_GIFT_OFFLINE_UNSIGNED_AUDIT',...result}));
}
