// Public-only historical regtest gift binding. Does not authenticate creator or authorize spending.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {digestProfessionalGiftBinding,verifyProfessionalGiftBindingCommitment} from './public-gift-binding-commitment.mjs';
const proof=JSON.parse(readFileSync(new URL('./fixtures/original-funded-24-public-evidence.json',import.meta.url),'utf8'));
const handoff=JSON.parse(readFileSync(new URL('./fixtures/same-gift-unsigned-handoff.json',import.meta.url),'utf8'));
assert.equal(proof.network,'regtest');
assert.match(proof.giftLinkFundingAddress,/^bcrt1/);
assert.equal(proof.fundingTxid,handoff.fundingTxid,'Original QR handoff must refer to original funded gift');
assert.equal(proof.releaseOutputs.length,24);
assert.equal(proof.releaseOutputs[0].vout,handoff.vout);
assert.equal(proof.releaseOutputs[0].sats,handoff.inputSats);
for(let i=0;i<24;i++){
 const r=proof.releaseOutputs[i];
 assert.equal(r.index,i);assert.equal(r.vout,i+2);
 assert.equal(r.sats,12000+i*1000);
 assert.match(r.scriptPubKeyHex,/^a914[0-9a-f]{40}87$/);
}
const binding={network:'regtest',fundingTxid:proof.fundingTxid,releaseOutputs:proof.releaseOutputs};
const digest=digestProfessionalGiftBinding(binding);
assert.match(digest,/^[a-f0-9]{64}$/);
assert.equal(verifyProfessionalGiftBindingCommitment(binding,digest).commitmentMatches,true);
for(const tamper of ['sats','scriptPubKeyHex','vout']){
 const altered=structuredClone(binding);
 const output=altered.releaseOutputs[1];
 if(tamper==='sats')output.sats++;
 if(tamper==='vout')output.vout++;
 if(tamper==='scriptPubKeyHex')output.scriptPubKeyHex='a914'+'00'.repeat(20)+'87';
 assert.throws(()=>verifyProfessionalGiftBindingCommitment(altered,digest),'Tampered '+tamper+' must fail');
}
const wrongTx=structuredClone(binding);
wrongTx.fundingTxid='0'.repeat(64);
assert.throws(()=>verifyProfessionalGiftBindingCommitment(wrongTx,digest));
const wrongDigest=(digest[0]==='0'?'1':'0')+digest.slice(1);
assert.throws(()=>verifyProfessionalGiftBindingCommitment(binding,wrongDigest));
assert.equal(proof.creatorAuthenticated,false);
assert.equal(proof.independentCommitmentAuthenticated,false);
assert.equal(proof.scheduleAuthenticated,false);
assert.equal(proof.beneficiaryAuthorized,false);
assert.equal(proof.broadcastAuthorized,false);
console.log('PASS_ORIGINAL_FUNDED_24_PUBLIC_BINDING',JSON.stringify({fundingTxid:proof.fundingTxid,outputs:24,digest,creatorAuthenticated:false,broadcast:false}));
