// bc1q21 Professional: combine public-only funding, gift CLTV and unsigned
// transaction consistency checks. NO authentication of Jade public key origin,
// Bitcoin Core RPC provenance, or independent user approval is implied.
// This function is a diagnostic and NEVER authorizes signing or broadcast.
import bitcoin from 'bitcoinjs-lib';
import {sha256} from '@noble/hashes/sha256';
import {inspectFundedDistributionCoreSnapshots} from './inspect-funded-distribution-core.mjs';
import {verifyGiftCltvOutputs} from './verify-gift-cltv-outputs.mjs';
const fail=m=>{throw Error('Professional combined gift inspection: '+m)};
const digest=b=>Buffer.from(sha256(b)).toString('hex');
export function inspectFundedGiftUnsignedTransaction({intent,plan,recipientPublicKeys,observations,unsigned}) {
 const funding=inspectFundedDistributionCoreSnapshots(intent,observations);
 const locks=verifyGiftCltvOutputs({intent,plan,recipientPublicKeys});
 if(unsigned?.format!=='bc1q21-professional-funded-distribution-unsigned-psbt-v1'||
    unsigned.network!=='regtest'||unsigned.signed!==false||
    unsigned.broadcast!==false||unsigned.hardwareSignatureVerified!==false||
    typeof unsigned.unsignedPsbtBase64!=='string')
   fail('Unsigned regtest creator PSBT required');
 let psbt,raw;
 try{
  raw=Buffer.from(unsigned.unsignedPsbtBase64,'base64');
  if(raw.toString('base64')!==unsigned.unsignedPsbtBase64||raw.length>100000)
    fail('Invalid unsigned PSBT encoding');
  psbt=bitcoin.Psbt.fromBuffer(raw,{network:bitcoin.networks.regtest});
 }catch{fail('Invalid unsigned PSBT')}
 if(digest(raw)!==unsigned.psbtSha256)fail('Unsigned PSBT hash mismatch');
 const outputs=[...intent.gifts,...(intent.serviceFee?[intent.serviceFee]:[]),
   ...(intent.change?[intent.change]:[])];
 if(psbt.txInputs.length!==intent.inputs.length||
    psbt.txOutputs.length!==outputs.length||
    unsigned.fundingInputCount!==intent.inputs.length||
    unsigned.giftOutputCount!==intent.gifts.length||
    unsigned.totalOutputCount!==outputs.length||
    unsigned.networkFeeSats!==intent.networkFeeSats)
   fail('Unsigned transaction dimensions or fee mismatch');
 let sumIn=0,sumOut=0;
 for(let i=0;i<intent.inputs.length;i++){
  const input=intent.inputs[i],actual=psbt.txInputs[i],metadata=psbt.data.inputs[i];
  if(Buffer.from(actual.hash).reverse().toString('hex')!==input.txid||
     actual.index!==input.vout||
     !metadata.witnessUtxo||
     metadata.witnessUtxo.value!==input.valueSats||
     metadata.witnessUtxo.script.toString('hex')!==input.scriptPubKeyHex||
     metadata.partialSig?.length||metadata.finalScriptSig||metadata.finalScriptWitness)
    fail('Funding outpoint or unsigned witness UTXO mismatch');
  sumIn+=input.valueSats;
 }
 for(let i=0;i<outputs.length;i++){
  const expected=outputs[i],actual=psbt.txOutputs[i];
  if(actual.value!==expected.valueSats||
     actual.script.toString('hex')!==expected.scriptPubKeyHex)
    fail('Gift, service fee or change output mismatch');
  sumOut+=actual.value;
 }
 if(!Number.isSafeInteger(sumIn)||!Number.isSafeInteger(sumOut)||
    sumIn-sumOut!==intent.networkFeeSats)fail('Funding accounting mismatch');
 return Object.freeze({
  format:'bc1q21-professional-combined-gift-consistency-v1',
  network:'regtest',approvedPsbtSha256:unsigned.psbtSha256,
  inputCount:intent.inputs.length,giftOutputCount:locks.releases.length,
  publicFundingSnapshotsConsistent:funding.snapshotsConsistent,
  cltvScriptsMatchSuppliedRecipientKeys:locks.scriptsMatchSuppliedPublicKeysAndPlan,
  unsignedTransactionMatchesSuppliedIntent:true,
  recipientKeyOriginAuthenticated:false,rpcProvenanceVerified:false,
  chainVerified:false,giftSpecificVerified:false,
  signingAuthorized:false,canSign:false,canBroadcast:false,
  nextStep:'AUTHENTICATE_JADE_RECIPIENT_KEY_ORIGIN_AND_CORE_RPC_PROVENANCE'
 });
}
