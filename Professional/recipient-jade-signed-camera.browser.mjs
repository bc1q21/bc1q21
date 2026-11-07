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
 let completed=false;
 const stop=()=>{
  active=false;generation++;
  // Invalidate partial multipart UR frames immediately on camera stop.
  decoder=new URDecoder();seen.clear();
  if(stream){for(const track of stream.getTracks()){
   try{track.stop();}catch{/* continue releasing other tracks */}
  }stream=null;}
  video.srcObject=null;
  // QR frames may contain a signed transaction. Erase the last video
  // snapshot from canvas on stop, release switch, or successful scan.
  try{
   const ctx=canvas.getContext('2d');
   if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
   canvas.width=0;canvas.height=0;
  }catch{canvas.width=0;canvas.height=0;}
 };
 const reset=()=>{stop();decoder=new URDecoder();seen=new Set();completed=false;status('Ready to scan Jade signed QR');};
 const tick=async token=>{
  if(!active||token!==generation)return;
  try{
   if(video.readyState>=2&&video.videoWidth>0){
    if(video.videoWidth>4096||video.videoHeight>4096||video.videoHeight<=0)
     throw Error('Camera frame dimensions exceed safe QR scan limits');
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
      const completedToken=generation;
      await onSignedPsbt(bytes);
      // A user can reset or switch releases while signature verification is
      // pending. Never report the superseded scan as complete.
      if(generation===completedToken)completed=true;
      return;
     }
    }
   }
  }catch(error){
   // Verification may reject after a recipient has already switched releases.
   // Do not stop the replacement scan or overwrite its current status.
   if(token!==generation)return;
   stop();status('Signed QR rejected: '+error.message);return;
  }
  if(active&&token===generation)setTimeout(()=>tick(token),100);
 };
 const start=async()=>{
  reset();
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires secure browser context');
  const token=generation;
  let acquired=null;
  try{
   // Desktop laptops often have no environment-facing camera. Request a
   // preferred rear camera first, then fall back to any available camera.
   // Never request audio; do not retain images or QR frames after stopping.
   try{
    acquired=await navigator.mediaDevices.getUserMedia({
     video:{facingMode:{ideal:'environment'}},audio:false});
   }catch(error){
    if(!['OverconstrainedError','NotFoundError'].includes(error?.name))throw error;
    if(token!==generation)return;
    acquired=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
   }
   if(token!==generation){for(const track of acquired.getTracks()){
    try{track.stop();}catch{/* permission was superseded */}
   }return;}
   stream=acquired;video.srcObject=stream;
   await video.play();
   if(token!==generation){for(const track of acquired.getTracks()){
    try{track.stop();}catch{/* permission was superseded */}
   }return;}
   active=true;
   status('Point camera at Jade Plus signed QR');void tick(token);
  }catch(error){
   if(acquired)for(const track of acquired.getTracks()){
    try{track.stop();}catch{/* continue cleanup */}
   }
   if(token!==generation)return;
   stop();throw error;
  }
 };
 return Object.freeze({start,stop,reset,get completed(){return completed;}});
}
