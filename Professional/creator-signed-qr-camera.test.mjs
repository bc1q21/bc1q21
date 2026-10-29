import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreatorSignedQrController} from './creator-signed-qr-camera.browser.mjs';
const approved=()=>({format:'bc1q21-professional-funded-distribution-unsigned-psbt-v1',
  network:'regtest',signed:false,broadcast:false,hardwareSignatureVerified:false});
const accepted=()=>({giftSpecificVerified:true,transactionIntentBound:true,
 signatureCryptographicallyVerified:true,broadcast:false,canBroadcast:false});
function harness({verify=()=>accepted(),getApprovedUnsigned=approved}={}){
 let callbacks,stopped=false,reported=0;
 const button=()=>({disabled:false,addEventListener(event,fn){this[event]=fn;}});
 const startButton=button(),stopButton=button(),statusElement={textContent:''};
 const controller=createCreatorSignedQrController({
  video:{},canvas:{},startButton,stopButton,statusElement,getApprovedUnsigned,verify,
  onVerified:()=>{reported++;},
  cameraFactory:args=>{
   callbacks=args;
   return {async start(){},stop(){stopped=true;}};
  }
 });
 return {controller,startButton,stopButton,statusElement,
  get callbacks(){return callbacks;},get stopped(){return stopped;},
  get reported(){return reported;}};
}
test('camera payload is not accepted until cryptographic verification succeeds',async()=>{
 const h=harness();await h.controller.start();
 assert.equal(h.controller.verified,null);
 assert.equal(h.startButton.disabled,true);
 await h.callbacks.onSignedPsbt(Buffer.from('test'));
 assert.equal(h.controller.verified.giftSpecificVerified,true);
 assert.equal(h.reported,1);
 assert.equal(h.startButton.disabled,true);
 assert.equal(h.stopButton.disabled,true);
});
test('rejects failed verification and does not report completion',async()=>{
 const h=harness({verify:()=>{throw Error('Wrong gift signature')}});
 await h.controller.start();
 await h.callbacks.onSignedPsbt(Buffer.from('bad'));
 assert.equal(h.controller.verified,null);
 assert.equal(h.reported,0);
 assert.match(h.statusElement.textContent,/rejected/i);
});
test('rejects verification without cryptographic proof',async()=>{
 const h=harness({verify:()=>({...accepted(),signatureCryptographicallyVerified:false})});
 await h.controller.start();await h.callbacks.onSignedPsbt(Buffer.from('fake'));
 assert.equal(h.controller.verified,null);
 assert.equal(h.reported,0);
});
test('stop and reset invalidate stale camera callback',async()=>{
 const h=harness();await h.controller.start();
 const stale=h.callbacks.onSignedPsbt;h.controller.stop();
 await stale(Buffer.from('old'));
 assert.equal(h.controller.verified,null);
 assert.equal(h.reported,0);
 assert.equal(h.stopped,true);
});
test('refuses non-regtest and unapproved signing data',async()=>{
 const h=harness({getApprovedUnsigned:()=>({...approved(),network:'mainnet'})});
 await assert.rejects(h.controller.start(),/Approved unsigned regtest/);
 assert.equal(h.controller.verified,null);
});
