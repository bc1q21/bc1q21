// Professional recipient-side signed QR camera transport.
// Reads Jade crypto-psbt frames only; caller must independently verify the
// signed PSBT and authorize any broadcast. Never reads recovery words.
import jsQR from 'jsqr';
import {URDecoder} from '@ngraveio/bc-ur';
import {Buffer} from 'buffer';
// crypto-psbt UR payload is a CBOR byte string; decode without Node streams.
function decodeCborBytes(raw){
 const bytes=Buffer.from(raw);if(!bytes.length)throw Error('Empty CBOR');
 const lead=bytes[0],major=lead>>5,info=lead&31;
 if(major!==2)throw Error('Expected CBOR byte string');
 let offset=1,length;
 if(info<24)length=info;
 else if(info===24){if(bytes.length<2)throw Error('Truncated CBOR');length=bytes[1];offset=2;}
 else if(info===25){if(bytes.length<3)throw Error('Truncated CBOR');length=bytes.readUInt16BE(1);offset=3;}
 else if(info===26){if(bytes.length<5)throw Error('Truncated CBOR');length=bytes.readUInt32BE(1);offset=5;}
 else throw Error('Unsupported CBOR byte-string length');
 if(length>100000||bytes.length!==offset+length)throw Error('Invalid CBOR byte-string length');
 return bytes.subarray(offset);
}

export function createJadeSignedCameraReceiver({video,canvas,onSignedPsbt,onStatus}){
 if(!video||!canvas||typeof onSignedPsbt!=='function')throw Error('Camera receiver needs video, canvas and signed-PSBT handler');
 const status=message=>{if(typeof onStatus==='function')onStatus(message)};
 let stream=null,active=false,decoder=new URDecoder(),seen=new Set(),generation=0;
 const stop=()=>{
  active=false;generation++;
  if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
  video.srcObject=null;
 };
 const reset=()=>{stop();decoder=new URDecoder();seen=new Set();status('Ready to scan Jade signed QR');};
 const tick=async token=>{
  if(!active||token!==generation)return;
  try{
   if(video.readyState>=2&&video.videoWidth>0){
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(video,0,0);
    const image=ctx.getImageData(0,0,canvas.width,canvas.height);
    const qr=jsQR(image.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});
    const frame=qr?.data;
    if(typeof frame==='string'&&frame.toLowerCase().startsWith('ur:crypto-psbt/')&&!seen.has(frame.toLowerCase())){
     if(seen.size>=512)throw Error('Too many QR frames');
     seen.add(frame.toLowerCase());decoder.receivePart(frame);
     status('Scanning signed Jade QR: '+seen.size+' frames');
     if(decoder.isComplete()){
      if(!decoder.isSuccess()||decoder.resultUR().type!=='crypto-psbt')throw Error('Invalid signed QR response');
      const bytes=decodeCborBytes(decoder.resultUR().cbor);
      if(bytes.length>100000||bytes.subarray(0,5).toString('hex')!=='70736274ff')throw Error('Invalid signed PSBT');
      stop();
      await onSignedPsbt(bytes);
      return;
     }
    }
   }
  }catch(error){stop();status('Signed QR rejected: '+error.message);return;}
  if(active&&token===generation)setTimeout(()=>tick(token),100);
 };
 const start=async()=>{
  reset();
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires secure browser context');
  try{
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
   video.srcObject=stream;await video.play();active=true;
   status('Point camera at Jade Plus signed QR');const token=generation;void tick(token);
  }catch(error){stop();throw error;}
 };
 return Object.freeze({start,stop,reset});
}
