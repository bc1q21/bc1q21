// bc1q21 Professional — verify Jade's signed creator PSBT against the exact
// approved unsigned funded distribution. Offline, public-only, regtest only.
// Requires all inputs signed by the expected Jade funding public key. No broadcast.
import bitcoin from 'bitcoinjs-lib';
import {sha256} from '@noble/hashes/sha256';
import {secp256k1} from '@noble/curves/secp256k1';
const fail = m => {throw Error('Professional creator signed return: '+m)};
const decode = b64 => {
 if(typeof b64!=='string'||b64.length>140000||b64.length%4||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(b64))fail('Invalid PSBT encoding');
 const raw=Buffer.from(b64,'base64');
 if(raw.toString('base64')!==b64)fail('Noncanonical PSBT');
 try{return bitcoin.Psbt.fromBuffer(raw,{network:bitcoin.networks.regtest})}
 catch{fail('Invalid PSBT')}
};
const equal=(a,b)=>Buffer.from(a||[]).equals(Buffer.from(b||[]));
export function verifySignedFundedDistributionPsbt(unsigned, signedBase64) {
 if(unsigned?.format!=='bc1q21-professional-funded-distribution-unsigned-psbt-v1'||
    unsigned.network!=='regtest'||unsigned.signed!==false||
    unsigned.broadcast!==false||unsigned.hardwareSignatureVerified!==false)
    fail('Expected original unsigned regtest creator PSBT');
 const before=decode(unsigned.unsignedPsbtBase64), after=decode(signedBase64);
 const digest=Buffer.from(sha256(Buffer.from(unsigned.unsignedPsbtBase64,'base64'))).toString('hex');
 if(digest!==unsigned.psbtSha256)fail('Approved PSBT fingerprint mismatch');
 if(!equal(before.data.globalMap.unsignedTx.toBuffer(),after.data.globalMap.unsignedTx.toBuffer()))
   fail('Signed transaction differs from approved transaction');
 if(before.txInputs.length!==unsigned.fundingInputCount||
    before.txOutputs.length!==unsigned.totalOutputCount||
    after.txInputs.length!==before.txInputs.length||
    after.txOutputs.length!==before.txOutputs.length)fail('Transaction dimensions changed');
 const permittedGlobal=new Set(['unsignedTx']);
 const permittedInput=new Set(['witnessUtxo','bip32Derivation','sighashType','partialSig']);
 const permittedOutput=new Set(['bip32Derivation']);
 const fields=(o,allowed)=>Object.keys(o).every(k=>allowed.has(k));
 if(!fields(before.data.globalMap,permittedGlobal)||
    !fields(after.data.globalMap,permittedGlobal))fail('Unexpected global PSBT metadata');
 for(let k=0;k<before.data.outputs.length;k++){
   if(!fields(before.data.outputs[k],permittedOutput)||
      !fields(after.data.outputs[k],permittedOutput))fail('Unexpected output PSBT metadata');
   if(JSON.stringify(before.data.outputs[k])!==JSON.stringify(after.data.outputs[k]))
      fail('Output derivation metadata changed');
 }
 for(let i=0;i<before.txInputs.length;i++){
   const original=before.data.inputs[i],returned=after.data.inputs[i];
   if(!fields(original,permittedInput)||!fields(returned,permittedInput))
     fail('Unexpected input PSBT metadata');
   if(original.partialSig?.length||!returned.partialSig||
      returned.partialSig.length!==1)fail('Exactly one returned signature per input required');
   if(!original.witnessUtxo||!returned.witnessUtxo||
      original.witnessUtxo.value!==returned.witnessUtxo.value||
      !equal(original.witnessUtxo.script,returned.witnessUtxo.script))
     fail('Funding UTXO metadata changed');
   if(original.sighashType!==returned.sighashType)
     fail('Sighash metadata changed');
   if(original.bip32Derivation?.length!==1||returned.bip32Derivation?.length!==1)
     fail('Expected one public Jade derivation per input');
   const a=original.bip32Derivation[0],b=returned.bip32Derivation[0];
   if(a.path!==b.path||!equal(a.pubkey,b.pubkey)||
      !equal(a.masterFingerprint,b.masterFingerprint))
     fail('Signer derivation changed');
   const signature=returned.partialSig[0];
   if(!equal(signature.pubkey,a.pubkey))fail('Wrong signing key');
   const expected=bitcoin.payments.p2wpkh({pubkey:a.pubkey,network:bitcoin.networks.regtest}).output;
   if(!equal(expected,original.witnessUtxo.script))fail('Input is not the Jade P2WPKH script');
   let decoded;
   try{decoded=bitcoin.script.signature.decode(signature.signature)}
   catch{fail('Invalid Bitcoin signature encoding')}
   if(decoded.hashType!==bitcoin.Transaction.SIGHASH_ALL ||
      (returned.sighashType!==undefined && returned.sighashType!==bitcoin.Transaction.SIGHASH_ALL))
     fail('Only SIGHASH_ALL signatures accepted');
   const tx=bitcoin.Transaction.fromBuffer(after.data.globalMap.unsignedTx.toBuffer());
   const scriptCode=bitcoin.payments.p2pkh({pubkey:a.pubkey,network:bitcoin.networks.regtest}).output;
   const hash=tx.hashForWitnessV0(i,scriptCode,original.witnessUtxo.value,decoded.hashType);
   if(!secp256k1.verify(decoded.signature,hash,signature.pubkey,{lowS:true}))
     fail('Cryptographic Bitcoin signature verification failed');
 }
 return Object.freeze({format:'bc1q21-professional-creator-signature-verified-v1',
   network:'regtest',approvedPsbtSha256:digest,
   inputSignaturesVerified:before.txInputs.length,
   transactionIntentBound:true,signatureCryptographicallyVerified:true,
   signed:true,broadcast:false});
}

// Finalize only after the exact unsigned transaction and every Jade signature
// have been independently verified. This produces raw regtest transaction bytes
// for local inspection; it never sends them to a node or authorizes broadcast.
export function finalizeVerifiedCreatorRegtestTransaction(unsigned,signedBase64){
 const verified=verifySignedFundedDistributionPsbt(unsigned,signedBase64);
 if(verified.signatureCryptographicallyVerified!==true||
    verified.transactionIntentBound!==true||verified.broadcast!==false)
   fail('Every Jade signature must pass verification before finalization');
 const psbt=decode(signedBase64);
 try{
  psbt.finalizeAllInputs();
 }catch{fail('Cannot finalize all signed funding inputs')}
 let transaction;
 try{transaction=psbt.extractTransaction(true)}
 catch{fail('Cannot extract finalized regtest transaction')}
 const raw=transaction.toBuffer();
 const txid=transaction.getId();
 if(raw.length<60||raw.length>100000||!/^[a-f0-9]{64}$/.test(txid))
   fail('Invalid finalized Bitcoin transaction');
 if(transaction.ins.length!==unsigned.fundingInputCount||
    transaction.outs.length!==unsigned.totalOutputCount)
   fail('Finalized transaction dimensions changed');
 return Object.freeze({
  format:'bc1q21-professional-finalized-creator-regtest-v1',
  network:'regtest',txid,rawTransactionHex:raw.toString('hex'),
  approvedPsbtSha256:verified.approvedPsbtSha256,
  inputSignaturesVerified:verified.inputSignaturesVerified,
  signatureCryptographicallyVerified:true,
  transactionIntentBound:true,finalized:true,
  signingAuthorized:false,broadcast:false,canBroadcast:false,
  nextStep:'INDEPENDENT_CORE_MEMPOOL_AND_AUTHORIZATION_CHECKS_REQUIRED'
 });
}
