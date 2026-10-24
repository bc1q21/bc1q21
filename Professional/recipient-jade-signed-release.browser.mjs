// Professional recipient QR return wiring: camera -> verified Jade signature.
// Browser-only, isolated regtest. No signing, wallet secrets or broadcasting.
import {createJadeSignedCameraReceiver} from './recipient-jade-signed-camera.browser.mjs';
import {verifySyntheticSignedPsbt} from './verify-synthetic-signed-psbt.mjs';
import {verifyReturnedSignedProfessionalPsbt} from './verify-signed-psbt-return.mjs';
import {createHash} from 'node:crypto';
import {Buffer} from 'buffer';

export function attachProfessionalJadeSignedReturn({video,canvas,startButton,stopButton,statusElement,approvedUnsignedPsbtBase64,signerPubkeyHex,onVerifiedSignedPsbt}){
 if(typeof approvedUnsignedPsbtBase64!=='string'||typeof signerPubkeyHex!=='string')throw Error('Reviewed unsigned PSBT and signer required');
 if(typeof onVerifiedSignedPsbt!=='function')throw Error('Verified return handler required');
 const approvedSha=createHash('sha256').update(Buffer.from(approvedUnsignedPsbtBase64,'base64')).digest('hex');
 const status=message=>{statusElement.textContent=message;};
 const receiver=createJadeSignedCameraReceiver({video,canvas,onStatus:status,
  onSignedPsbt:async raw=>{
   const signed=Buffer.from(raw);
   verifyReturnedSignedProfessionalPsbt(approvedUnsignedPsbtBase64,signed.toString('base64'),approvedSha);
   verifySyntheticSignedPsbt(signed,approvedUnsignedPsbtBase64,signerPubkeyHex);
   status('Jade signature verified. No Bitcoin broadcast.');
   await onVerifiedSignedPsbt(signed);
  }});
 startButton.onclick=async()=>{try{await receiver.start();stopButton.disabled=false;}catch(error){status('Camera unavailable: '+error.message);}};
 stopButton.onclick=()=>{receiver.stop();stopButton.disabled=true;status('Camera stopped');};
 return receiver;
}
