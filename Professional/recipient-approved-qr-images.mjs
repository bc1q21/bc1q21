// Professional regtest-only adapter: encode already-approved UR frames as
// embedded QR images for the recipient offline Jade display.
// This does not approve a release, derive keys, sign, or broadcast.
import QRCode from 'qrcode';
import assert from 'node:assert/strict';

export async function renderApprovedRecipientQrImages(reviewed) {
 assert.ok(reviewed && reviewed.network==='regtest','Regtest reviewed QR handoff required');
 assert.equal(reviewed.verifiedRoundTrip,true,'QR handoff must have verified round trip');
 assert.equal(reviewed.format,'ur:crypto-psbt');
 assert.equal(reviewed.signed,false);
 assert.equal(reviewed.broadcast,false);
 assert.ok(Array.isArray(reviewed.frames)&&reviewed.frames.length>0&&reviewed.frames.length<=512);
 const frames=reviewed.frames.map(frame=>{
  assert.ok(typeof frame==='string'&&/^ur:crypto-psbt\//i.test(frame)&&frame.length<=4096,'Invalid crypto-psbt QR frame');
  return frame;
 });
 const qrImages=[];
 for(const frame of frames)qrImages.push(await QRCode.toDataURL(frame,{errorCorrectionLevel:'L',margin:2,width:360}));
 return Object.freeze({...reviewed,frames:Object.freeze(frames),qrImages:Object.freeze(qrImages)});
}
