// Isolated regtest-only QR payload boundary. Requires an already-consumed,
// exact-once approval handoff, and independently decodes the produced UR frames.
// This is a test-only encoder, not a trusted signing device or live UI.
import { createHash } from 'node:crypto';
import { URDecoder } from '@ngraveio/bc-ur';
import { makeCryptoPsbtFrames } from './crypto-psbt-frames.mjs';
const fail=m=>{throw Error('Professional approved QR: '+m)};
export function makeApprovedCryptoPsbtQrFrames(approvedHandoff,{fragmentLength=120,frameCount=64}={}){
 if(!approvedHandoff||approvedHandoff.network!=='regtest'||
  approvedHandoff.approvalVerified!==true||approvedHandoff.signed!==false||
  approvedHandoff.broadcast!==false||approvedHandoff.nextEncoder!=='ur:crypto-psbt')
  fail('Exact approved regtest unsigned handoff required');
 const b64=approvedHandoff.unsignedPsbtBase64;
 if(typeof b64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)||b64.length%4)
  fail('Invalid unsigned PSBT encoding');
 const bytes=Buffer.from(b64,'base64');
 if(bytes.toString('base64')!==b64)fail('Noncanonical PSBT');
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!==approvedHandoff.psbtSha256)fail('PSBT digest mismatch');
 const frames=makeCryptoPsbtFrames(bytes,{fragmentLength,frameCount});
 const decoder=new URDecoder();
 for(const frame of frames)decoder.receivePart(frame);
 if(!decoder.isComplete()||!decoder.isSuccess())fail('QR frame set cannot reconstruct PSBT');
 const cbor=Buffer.from(decoder.resultUR().cbor);
 if(cbor.length<2)fail('Invalid decoded crypto-psbt CBOR');
 let head=1,n=cbor[0]-0x40;
 if(cbor[0]===0x58){head=2;n=cbor[1];}
 else if(cbor[0]===0x59){head=3;n=cbor.readUInt16BE(1);}
 else if(cbor[0]===0x5a){head=5;n=cbor.readUInt32BE(1);}
 else if(cbor[0]<0x40||cbor[0]>0x57)fail('Invalid CBOR byte string');
 if(n!==bytes.length||!cbor.subarray(head).equals(bytes))fail('QR payload differs from approved PSBT');
 return Object.freeze({network:'regtest',psbtSha256:digest,frames,
  signed:false,broadcast:false,format:'ur:crypto-psbt',verifiedRoundTrip:true});
}
