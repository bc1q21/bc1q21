// Professional isolated regtest: require independently approved transaction intent
// before any unsigned PSBT is released to the QR/signing preparation step.
// This is a machine-verifiable boundary, NOT proof of human review or secure UI.
import bitcoin from 'bitcoinjs-lib';
import { prepareProfessionalReleaseFromPublicHandoff } from './public-funding-release-integration.mjs';

const fields=new Set(['destinationScriptHex','destinationSats','expectedTxid','vout','expectedSats','locktime','signerPubkeyHex']);
const fail=message=>{throw Error('Professional approval gate: '+message);};
export function prepareApprovedProfessionalRelease(publicHandoff,funding,approvedIntent){
 if(!approvedIntent||typeof approvedIntent!=='object'||Array.isArray(approvedIntent)||
   Object.keys(approvedIntent).length!==fields.size||
   Object.keys(approvedIntent).some(k=>!fields.has(k)))fail('Exact independent approval required');
 for(const name of fields){
  if(!Object.hasOwn(approvedIntent,name))fail('Missing approved field '+name);
  const expected=name==='destinationScriptHex'||name==='expectedTxid'||name==='signerPubkeyHex'?
   (typeof approvedIntent[name]==='string'?approvedIntent[name].toLowerCase():null):approvedIntent[name];
  const actual=name==='locktime'?publicHandoff?.locktime:name==='signerPubkeyHex'?
   publicHandoff?.signerPubkeyHex:funding?.[name];
  if(expected!==actual)fail('Approval mismatch: '+name);
 }
 const release=prepareProfessionalReleaseFromPublicHandoff(publicHandoff,funding);
 let psbt;
 try{psbt=bitcoin.Psbt.fromBase64(release.unsignedPsbtBase64);}
 catch{fail('Invalid built PSBT');}
 if(psbt.txInputs.length!==1||psbt.txOutputs.length!==1)fail('Unexpected transaction structure');
 const input=psbt.txInputs[0],output=psbt.txOutputs[0];
 if(output.script.toString('hex')!==approvedIntent.destinationScriptHex.toLowerCase()||
    output.value!==approvedIntent.destinationSats)fail('Built output differs from approval');
 if(Buffer.from(input.hash).reverse().toString('hex')!==approvedIntent.expectedTxid.toLowerCase()||
    input.index!==approvedIntent.vout)fail('Built input differs from approval');
 if(psbt.locktime!==approvedIntent.locktime||input.sequence===0xffffffff)
  fail('Built timelock differs from approval');
 if(psbt.data.inputs[0]?.bip32Derivation?.[0]?.pubkey?.toString('hex')!==
   approvedIntent.signerPubkeyHex.toLowerCase())fail('Built signer differs from approval');
 if(release.signed!==false||release.broadcast!==false)fail('Release must remain unsigned and unbroadcast');
 return Object.freeze({...release,approvalVerified:true});
}
