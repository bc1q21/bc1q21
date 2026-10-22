// Professional-only public gift commitment. This detects accidental or
// malicious changes to a gift binding after its digest was independently
// delivered. It does NOT authenticate the creator or establish who delivered
// the expected digest. Never use this digest alone to authorize signing.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

function canonicalBinding(binding) {
 assert.equal(binding?.network,'regtest','Regtest binding required');
 assert.match(binding?.fundingTxid??'',/^[a-f0-9]{64}$/,'Valid funding txid required');
 assert.ok(Array.isArray(binding.releaseOutputs)&&binding.releaseOutputs.length>0&&
  binding.releaseOutputs.length<=100,'Bounded release list required');
 const seen=new Set();
 const outputs=binding.releaseOutputs.map((r,index)=>{
  assert.equal(r?.index,index,'Release index mismatch');
  assert.ok(Number.isSafeInteger(r.vout)&&r.vout>=0&&!seen.has(r.vout),
   'Duplicate or invalid output index');
  seen.add(r.vout);
  assert.ok(Number.isSafeInteger(r.sats)&&r.sats>0,'Valid satoshi amount required');
  assert.match(r.scriptPubKeyHex??'',/^(?:[a-f0-9]{2})+$/,'Valid script required');
  return [index,r.vout,r.sats,r.scriptPubKeyHex];
 });
 return JSON.stringify(['bc1q21-professional-gift-binding-v1','regtest',
  binding.fundingTxid,outputs]);
}
export function digestProfessionalGiftBinding(binding) {
 return createHash('sha256').update(canonicalBinding(binding),'utf8').digest('hex');
}
export function verifyProfessionalGiftBindingCommitment(binding,expectedDigest) {
 assert.match(expectedDigest??'',/^[a-f0-9]{64}$/,'Independent gift commitment required');
 const actual=digestProfessionalGiftBinding(binding);
 assert.equal(actual,expectedDigest,'Gift binding differs from independently held commitment');
 return Object.freeze({network:'regtest',bindingDigest:actual,commitmentMatches:true,
  creatorAuthenticated:false,beneficiaryAuthorized:false,
  canExportSigningQr:false,canSign:false,canBroadcast:false});
}
