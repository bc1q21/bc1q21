import test from 'node:test';
import assert from 'node:assert/strict';
import {digestProfessionalGiftBinding,verifyProfessionalGiftBindingCommitment} from './public-gift-binding-commitment.mjs';
const binding={network:'regtest',fundingTxid:'a'.repeat(64),
 releaseOutputs:Array.from({length:24},(_,index)=>({
  index,vout:index,sats:12000+index*1000,
  scriptPubKeyHex:'0014'+index.toString(16).padStart(2,'0').repeat(20)
 }))};

test('24-release commitment is stable and never authorizes spending',()=>{
 const digest=digestProfessionalGiftBinding(binding);
 assert.match(digest,/^[a-f0-9]{64}$/);
 assert.equal(digestProfessionalGiftBinding(structuredClone(binding)),digest);
 const result=verifyProfessionalGiftBindingCommitment(binding,digest);
 assert.equal(result.commitmentMatches,true);
 assert.equal(result.creatorAuthenticated,false);
 assert.equal(result.canExportSigningQr,false);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
});
test('changes to output order, amount, script or txid invalidate commitment',()=>{
 const digest=digestProfessionalGiftBinding(binding);
 for(const changed of [
  {...binding,fundingTxid:'b'.repeat(64)},
  {...binding,releaseOutputs:binding.releaseOutputs.map((r,i)=>i===7?{...r,sats:r.sats+1}:r)},
  {...binding,releaseOutputs:binding.releaseOutputs.map((r,i)=>i===7?{...r,scriptPubKeyHex:'0014'+'ff'.repeat(20)}:r)},
  {...binding,releaseOutputs:binding.releaseOutputs.map((r,i)=>i===7?{...r,vout:23}:r)}
 ])assert.throws(()=>verifyProfessionalGiftBindingCommitment(changed,digest));
});
test('caller must provide independently held commitment; no self-approval',()=>{
 assert.throws(()=>verifyProfessionalGiftBindingCommitment(binding,undefined),/Independent gift commitment/);
 assert.throws(()=>verifyProfessionalGiftBindingCommitment(binding,'b'.repeat(64)),/differs/);
});
