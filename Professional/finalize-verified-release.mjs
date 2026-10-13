// Isolated Professional: finalize only after exact approved PSBT and
// cryptographic signature verification. Regtest only; NEVER broadcast.
import bitcoin from 'bitcoinjs-lib';
import { verifyProfessionalReturnedSignature } from './verify-returned-signature.mjs';
const fail=m=>{throw Error('Professional safe finalization: '+m)};
export function finalizeVerifiedProfessionalRelease(originalUnsignedBase64,returnedSignedBase64,approvedSha256){
 const verification=verifyProfessionalReturnedSignature(originalUnsignedBase64,returnedSignedBase64,approvedSha256);
 if(verification.signatureCryptographicallyVerified!==true||
    verification.transactionMatches!==true||verification.sighashType!==bitcoin.Transaction.SIGHASH_ALL)
  fail('Transaction not independently verified');
 let psbt;
 try{psbt=bitcoin.Psbt.fromBase64(returnedSignedBase64,{network:bitcoin.networks.regtest})}
 catch{fail('Malformed signed PSBT')}
 const meta=psbt.data.inputs[0];
 if(meta.partialSig?.length!==1||!meta.redeemScript||meta.finalScriptSig||meta.finalScriptWitness)
  fail('Expected one non-final legacy CLTV signature');
 // Exact P2SH scriptSig: OP_0 is not needed for CHECKSIG-only redeemScript.
 const sig=Buffer.from(meta.partialSig[0].signature);
 const redeem=Buffer.from(meta.redeemScript);
 const finalScriptSig=bitcoin.script.compile([sig,redeem]);
 try{
  psbt.finalizeInput(0,()=>({finalScriptSig}));
  const tx=psbt.extractTransaction(true);
  if(tx.ins.length!==1||tx.outs.length!==1)fail('Unexpected final transaction shape');
  if(!tx.ins[0].script.equals(finalScriptSig))fail('Final script differs');
  return Object.freeze({network:'regtest',txid:tx.getId(),rawTransactionHex:tx.toHex(),
   approvedPsbtSha256:approvedSha256,signatureCryptographicallyVerified:true,
   finalized:true,broadcast:false});
 }catch(e){
  if(String(e.message||e).startsWith('Professional safe finalization:'))throw e;
  fail('Finalization failed');
 }
}
