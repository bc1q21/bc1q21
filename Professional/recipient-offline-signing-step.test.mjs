import test from 'node:test';
import assert from 'node:assert/strict';
import {renderProfessionalOfflineSigningStep} from './recipient-offline-signing-step.mjs';

const base={format:'bc1q21-professional-recipient-integration-v1',network:'regtest',canSign:false,canBroadcast:false,blockers:['Trusted chain source missing']};
test('recipient signing step is clearly disabled while authorization is missing',()=>{
 const html=renderProfessionalOfflineSigningStep(base);
 assert.match(html,/Prepare offline signing QR<\/button>/);
 assert.match(html,/disabled aria-disabled="true"/);
 assert.match(html,/Trusted chain source missing/);
 assert.match(html,/never enter them into this website/);
 assert.doesNotMatch(html,/<input[^>]*(seed|mnemonic|password)/i);
});
test('untrusted gift status cannot activate signing',()=>{
 assert.throws(()=>renderProfessionalOfflineSigningStep({...base,canSign:true}));
 assert.throws(()=>renderProfessionalOfflineSigningStep({...base,canBroadcast:true}));
 assert.throws(()=>renderProfessionalOfflineSigningStep({...base,network:'bitcoin'}));
});
test('blocker text is HTML escaped, never interpreted as markup',()=>{
 const html=renderProfessionalOfflineSigningStep({...base,blockers:['<script>alert(1)</script>']});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});


test('reviewed Jade QR session renders animated frames and signed-return camera controls',()=>{
 const session={network:'regtest',verifiedRoundTrip:true,format:'ur:crypto-psbt',signed:false,broadcast:false,
  frames:['ur:crypto-psbt/1-2/abcd','ur:crypto-psbt/2-2/efgh'],
  qrImages:['data:image/png;base64,AAAA','data:image/png;base64,BBBB']};
 const html=renderProfessionalOfflineSigningStep(base,session);
 assert.match(html,/id="jade-unsigned-qr"/);
 assert.match(html,/id="jade-signed-video"/);
 assert.match(html,/id="jade-signed-start"/);
 assert.match(html,/id="jade-signed-status"/);
 assert.match(html,/QR frame 1 of 2/);
 assert.match(html,/No Bitcoin broadcast/);
 assert.doesNotMatch(html,/type="password"|mnemonic.*<input/i);
 assert.throws(()=>renderProfessionalOfflineSigningStep(base,{...session,qrImages:[]}));
 assert.throws(()=>renderProfessionalOfflineSigningStep(base,{...session,network:'bitcoin'}));
 assert.throws(()=>renderProfessionalOfflineSigningStep(base,{...session,broadcast:true}));
});


test('recipient QR camera markup exposes exactly the required mount points',()=>{
 const session={network:'regtest',verifiedRoundTrip:true,format:'ur:crypto-psbt',signed:false,broadcast:false,
  frames:['ur:crypto-psbt/1-1/abcd'],qrImages:['data:image/png;base64,AAAA']};
 const html=renderProfessionalOfflineSigningStep(base,session);
 for(const id of ['jade-signed-video','jade-signed-canvas','jade-signed-start','jade-signed-stop','jade-signed-status']){
  assert.equal(html.split('id="'+id+'"').length-1,1,'Expected one '+id+' mount point');
 }
 assert.match(html,/id="sign" disabled/);
});

test('animated QR renderer emits a valid script closing tag',()=>{
 const session={network:'regtest',verifiedRoundTrip:true,format:'ur:crypto-psbt',signed:false,broadcast:false,
  frames:['ur:crypto-psbt/1-1/abcd'],qrImages:['data:image/png;base64,AAAA']};
 const html=renderProfessionalOfflineSigningStep(base,session);
 const closeTag='<'+'/script>';
 assert.ok(html.includes(closeTag),'Missing HTML script closing tag');
 assert.equal(html.split(closeTag).length-1,1,'Expected one closing script tag');
});
