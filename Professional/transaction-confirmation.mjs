// Public-only, read-only confirmation record derived from the actual unsigned PSBT.
// Regtest-only prototype; record is NOT a substitute for trusted human review.
import bitcoin from 'bitcoinjs-lib';
import { createHash } from 'node:crypto';
import { prepareApprovedProfessionalRelease } from './approved-release-gate.mjs';

const fail=msg=>{throw Error('Professional confirmation: '+msg)};
export function createProfessionalTransactionConfirmation(publicHandoff,funding,approvedIntent){
 const release=prepareApprovedProfessionalRelease(publicHandoff,funding,approvedIntent);
 const psbt=bitcoin.Psbt.fromBase64(release.unsignedPsbtBase64);
 if(psbt.txInputs.length!==1||psbt.txOutputs.length!==1)fail('Unexpected transaction shape');
 const input=psbt.txInputs[0],output=psbt.txOutputs[0],meta=psbt.data.inputs[0];
 if(!meta.nonWitnessUtxo||!meta.redeemScript)fail('Missing funding or script evidence');
 const prev=bitcoin.Transaction.fromBuffer(meta.nonWitnessUtxo);
 const txid=Buffer.from(input.hash).reverse().toString('hex');
 if(prev.getId()!==txid||!prev.outs[input.index])fail('Funding mismatch');
 const sats=prev.outs[input.index].value;
 const fee=sats-output.value;
 if(fee<0||fee>100000)fail('Unsafe fee');
 let address;
 try{address=bitcoin.address.fromOutputScript(output.script,bitcoin.networks.regtest)}
 catch{fail('Destination address cannot be independently decoded')}
 const script=bitcoin.script.decompile(meta.redeemScript);
 if(!script||script.length!==5||!Buffer.isBuffer(script[0])||
   script[1]!==bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY||
   script[2]!==bitcoin.opcodes.OP_DROP||
   !Buffer.isBuffer(script[3])||script[4]!==bitcoin.opcodes.OP_CHECKSIG)
  fail('Unsupported CLTV script');
 const scriptLocktime=bitcoin.script.number.decode(script[0],5,true);
 if(scriptLocktime!==psbt.locktime)fail('CLTV script locktime mismatch');
 const psbtHash=createHash('sha256').update(Buffer.from(release.unsignedPsbtBase64,'base64')).digest('hex');
 return Object.freeze({
  version:1,network:'regtest',status:'UNSIGNED - TEST ONLY - NOT BROADCAST',
  fundingTxid:txid,fundingVout:input.index,inputSats:sats,
  destinationAddress:address,destinationScriptHex:output.script.toString('hex'),
  payoutSats:output.value,feeSats:fee,
  locktime:psbt.locktime,locktimeType:psbt.locktime>=500000000?'timestamp':'block-height',
  sequence:input.sequence,signerPubkeyHex:script[3].toString('hex'),
  psbtSha256:psbtHash,approvalVerified:release.approvalVerified,
  signed:false,broadcast:false
 });
}
