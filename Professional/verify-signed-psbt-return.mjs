// Isolated Professional: verify returned signed PSBT retains the exact approved
// unsigned transaction and signing metadata. No broadcasting or secret handling.
// This verifies intent binding, NOT cryptographic signature validity; that is
// separately checked by the signed-transaction validation pipeline.
import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
const fail=m=>{throw Error('Professional signed return: '+m)};
const canonical=b64=>{
 if(typeof b64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)||b64.length%4)fail('Invalid PSBT base64');
 const bytes=Buffer.from(b64,'base64');
 if(bytes.toString('base64')!==b64||bytes.length>100000)fail('Noncanonical or oversized PSBT');
 return bytes;
};
const txShape=psbt=>{
 const tx=psbt.data.globalMap.unsignedTx.toBuffer();
 return Buffer.from(tx);
};
export function verifyReturnedSignedProfessionalPsbt(approvedUnsignedBase64,returnedSignedBase64,expectedSha256){
 const unsignedBytes=canonical(approvedUnsignedBase64);
 const digest=createHash('sha256').update(unsignedBytes).digest('hex');
 if(digest!==expectedSha256)fail('Approved unsigned fingerprint mismatch');
 let original,returned;
 try{original=bitcoin.Psbt.fromBuffer(unsignedBytes);returned=bitcoin.Psbt.fromBuffer(canonical(returnedSignedBase64))}
 catch{fail('Invalid PSBT structure')}
 if(original.txInputs.length!==1||original.txOutputs.length!==1||
    returned.txInputs.length!==1||returned.txOutputs.length!==1)fail('Unexpected transaction shape');
 if(!txShape(original).equals(txShape(returned)))fail('Returned unsigned transaction differs from approved transaction');
 const before=original.data.inputs[0],after=returned.data.inputs[0];
 if(before.partialSig?.length||before.finalScriptSig||before.finalScriptWitness||before.tapKeySig)
  fail('Original PSBT must be unsigned');
 if(!after.partialSig?.length&&!after.finalScriptSig&&!after.finalScriptWitness&&!after.tapKeySig)
  fail('Returned PSBT has no signing material');
 for(const key of ['nonWitnessUtxo','redeemScript','witnessScript']){
  if(before[key]&&!Buffer.from(before[key]).equals(Buffer.from(after[key]||[])))
   fail('Returned signing metadata differs: '+key);
 }
 if(before.bip32Derivation?.length!==after.bip32Derivation?.length)fail('Derivation count differs');
 for(let i=0;i<(before.bip32Derivation?.length||0);i++){
  const a=before.bip32Derivation[i],b=after.bip32Derivation[i];
  if(!a.pubkey.equals(b.pubkey)||!a.masterFingerprint.equals(b.masterFingerprint)||
     a.path!==b.path)fail('Returned derivation differs');
 }
 return Object.freeze({network:'regtest',approvedPsbtSha256:digest,transactionMatches:true,
  signingMaterialPresent:true,signatureCryptographicallyVerified:false,broadcast:false});
}
