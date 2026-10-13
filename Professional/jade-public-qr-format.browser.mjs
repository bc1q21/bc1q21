// Isolated diagnostic: recognize Jade animated QR type without decoding or retaining key contents.
// Never displays xpubs or secret payloads. Not an xpub importer.
import jsQR from 'jsqr';
import { URDecoder } from '@ngraveio/bc-ur';
const $=id=>document.getElementById(id);
let stream,active=false,decoder=new URDecoder(),seen=new Set();
const status=s=>{$('status').textContent=s;};
function stop(){active=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('start').disabled=false;$('stop').disabled=true;}
function reset(){decoder=new URDecoder();seen=new Set();$('result').textContent='';status('Ready. Only QR format metadata will be displayed.');}
function inspect(value){
 if(typeof value!=='string'||value.length>4096)return;
 const match=/^ur:([a-z0-9-]+)\//i.exec(value);
 if(!match){status('QR seen, but not a supported UR envelope. No data retained.');return;}
 const type=match[1].toLowerCase();
 // Do not ingest or display potentially sensitive UR types.
 if(!['crypto-account','crypto-hdkey','crypto-output'].includes(type)){
  stop();$('result').textContent='QR type: '+type+' — rejected. No contents decoded or saved.';
  status('Stopped: unapproved QR payload type.');return;
 }
 if(seen.has(value))return;
 seen.add(value);
 try{
  decoder.receivePart(value);
  status('Public-key QR type: '+type+'. Frames received: '+seen.size);
  if(decoder.isComplete()){
   const result=decoder.resultUR();
   stop();
   $('result').textContent='QR format confirmed: ur:'+result.type+'. Public-key contents NOT decoded, displayed, stored or transmitted.';
   status('Format check completed.');
  }
 }catch{stop();status('QR format decoding failed. Camera stopped.');}
}
async function tick(){
 if(!active)return;
 const video=$('video');
 if(video.readyState>=2&&video.videoWidth){
  const canvas=$('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0);
  const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
  const code=jsQR(frame.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});
  if(code)inspect(code.data);
 }
 if(active)setTimeout(tick,150);
}
$('start').onclick=async()=>{
 reset();
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera API unavailable; use a secure localhost context.');
  stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
  $('video').srcObject=stream;await $('video').play();
  active=true;$('start').disabled=true;$('stop').disabled=false;
  status('Scanning. Only UR type metadata will be reported.');tick();
 }catch(e){stop();status('Camera unavailable: '+e.message);}
};
$('stop').onclick=()=>{stop();status('Stopped.');};
$('reset').onclick=()=>{stop();reset();};
reset();
