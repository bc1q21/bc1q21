// Isolated Professional: release exactly the PSBT bytes whose SHA-256 digest
// was explicitly acknowledged. No network, signing, or broadcast.
import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
const fail=m=>{throw Error('Professional approved handoff: '+m)};
export function releaseExactlyApprovedUnsignedPsbt(release,confirmation){
 if(!release||!confirmation||confirmation.explicitlyApproved!==true||
  confirmation.network!=='regtest'||release.network!=='regtest'||
  release.signed!==false||release.broadcast!==false||
  confirmation.signed!==false||confirmation.broadcast!==false)
  fail('Explicit unsigned regtest approval required');
 const b64=release.unsignedPsbtBase64;
 if(typeof b64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)||b64.length%4)
  fail('Invalid PSBT encoding');
 const bytes=Buffer.from(b64,'base64');
 if(bytes.toString('base64')!==b64||bytes.length>100000)fail('Noncanonical or oversized PSBT');
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!==confirmation.psbtSha256)fail('PSBT changed after approval');
 let psbt;
 try{psbt=bitcoin.Psbt.fromBuffer(bytes)}catch{fail('Invalid PSBT')}
 if(psbt.txInputs.length!==1||psbt.txOutputs.length!==1)fail('Unexpected transaction shape');
 const inp=psbt.data.inputs[0];
 if(inp.partialSig?.length||inp.finalScriptSig||inp.finalScriptWitness||inp.tapKeySig)
  fail('Signed PSBT cannot enter unsigned handoff');
 return Object.freeze({network:'regtest',unsignedPsbtBase64:b64,psbtSha256:digest,
  approvalVerified:true,signed:false,broadcast:false,nextEncoder:'ur:crypto-psbt'});
}
