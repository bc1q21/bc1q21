// bc1q21 Professional — isolated creator camera/verification controller.
// Binds the existing Jade camera transport to exact gift-specific verification.
// A successful camera decode is NEVER sufficient to mark a gift verified.
// Disposable regtest only. No signing, broadcast, keys, or production wiring.
import {Buffer} from 'buffer';
import {createJadeSignedCameraReceiver} from './recipient-jade-signed-camera.browser.mjs';
import {verifyCreatorSignedQrPayload} from './creator-signed-qr-verification-gate.mjs';

export function createCreatorSignedQrController({
  video, canvas, startButton, stopButton, statusElement,
  getApprovedUnsigned, onVerified = () => {},
  cameraFactory = createJadeSignedCameraReceiver,
  verify = verifyCreatorSignedQrPayload
}) {
  if(!video||!canvas||!startButton||!stopButton||!statusElement||
     typeof getApprovedUnsigned!=='function'||typeof onVerified!=='function'||
     typeof cameraFactory!=='function'||typeof verify!=='function')
    throw Error('Creator camera requires controls and verification dependencies');
  let approved = null, receiver = null, verified = null, busy = false, generation = 0;
  const status = message => {statusElement.textContent=message;};
  const update = () => {
    const candidate=getApprovedUnsigned();
    startButton.disabled=busy||Boolean(verified)||
      candidate?.format!=='bc1q21-professional-funded-distribution-unsigned-psbt-v1'||
      candidate.network!=='regtest'||candidate.signed!==false||
      candidate.broadcast!==false||candidate.hardwareSignatureVerified!==false;
    stopButton.disabled=!busy;
  };
  const invalidate = () => {
    generation++;
    receiver?.stop();
    receiver=null;approved=null;verified=null;busy=false;
    status('No verified Jade signature. Signing is not authorized.');
    update();
  };
  async function start() {
    if(busy||verified)throw Error('A signing scan is already active or complete');
    const candidate=getApprovedUnsigned();
    if(candidate?.format!=='bc1q21-professional-funded-distribution-unsigned-psbt-v1'||
       candidate.network!=='regtest'||candidate.signed!==false||
       candidate.broadcast!==false||candidate.hardwareSignatureVerified!==false)
      throw Error('Approved unsigned regtest gift required before scanning');
    invalidate();
    approved=candidate;
    busy=true;update();
    const token=++generation;
    receiver=cameraFactory({
      video,canvas,onStatus:message=>{if(token===generation)status(message);},
      onSignedPsbt:async raw=>{
        if(token!==generation||!busy||!approved)return;
        try{
          if(!Buffer.isBuffer(raw))raw=Buffer.from(raw);
          const result=verify(approved,raw);
          if(token!==generation)return;
          if(result?.giftSpecificVerified!==true||
             result.transactionIntentBound!==true||
             result.signatureCryptographicallyVerified!==true||
             result.broadcast!==false||result.canBroadcast!==false)
            throw Error('Returned signature is not verified for this gift');
          verified=result;
          busy=false;update();
          status('Jade signature verified for this gift. No broadcast performed.');
          onVerified(result);
        }catch(error){
          if(token!==generation)return;
          verified=null;busy=false;update();
          status('Signed Jade QR rejected: '+error.message);
        }
      }
    });
    try{await receiver.start();}
    catch(error){
      if(token===generation){
        busy=false;approved=null;receiver?.stop();receiver=null;update();
        status('Camera unavailable: '+error.message);
      }
    }
  }
  function stop() {
    if(!busy)return;
    invalidate();
    status('Camera stopped. No gift authorization.');
  }
  startButton.addEventListener('click',()=>{void start().catch(error=>status('Cannot scan: '+error.message));});
  stopButton.addEventListener('click',stop);
  invalidate();
  return Object.freeze({
    start,stop,invalidate,refresh:update,
    get verified(){return verified;},
    get active(){return busy;}
  });
}
