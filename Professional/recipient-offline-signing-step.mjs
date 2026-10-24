// Professional-only offline recipient signing UX fragment.
// This is a rendering boundary, NOT authorization or a PSBT producer.
// The actual QR session must originate from independently authenticated,
// gift-specific, mature and explicitly approved release evidence.
import assert from 'node:assert/strict';

const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderProfessionalOfflineSigningStep(integration, signingQrSession=null) {
 assert.ok(integration&&integration.format==='bc1q21-professional-recipient-integration-v1',
  'Verified Professional integration model required');
 assert.equal(integration.network,'regtest','Regtest only');
 assert.equal(integration.canSign,false,'Signing permission must not be inferred from a gift link');
 assert.equal(integration.canBroadcast,false,'Broadcast permission must not be inferred from a gift link');
 assert.ok(Array.isArray(integration.blockers),'Release blockers required');
 const reasons=integration.blockers.map(x=>'<li>'+esc(x)+'</li>').join('');
 // A reviewed QR session may be displayed without granting page-level signing
 // or broadcast authority. Never accept frames from gift-link query parameters.
 if(signingQrSession!==null){
  assert.equal(signingQrSession.network,'regtest');
  assert.equal(signingQrSession.verifiedRoundTrip,true);
  assert.equal(signingQrSession.format,'ur:crypto-psbt');
  assert.equal(signingQrSession.signed,false);
  assert.equal(signingQrSession.broadcast,false);
  assert.ok(Array.isArray(signingQrSession.frames)&&signingQrSession.frames.length>0&&signingQrSession.frames.length<=512);
  for(const frame of signingQrSession.frames)assert.match(frame,/^ur:crypto-psbt\\//i);
 }
 const qrDisplay=signingQrSession===null?'':
  '<section aria-label="Jade unsigned transaction QR frames">'+
  '<p>Scan the animated unsigned transaction QR with Jade Plus. Then scan Jade’s signed response.</p>'+
  '<img id="jade-unsigned-qr" alt="Unsigned transaction QR for Jade Plus" width="360" height="360" src="'+esc(signingQrSession.qrImages[0])+'">'+
  '<p id="jade-qr-progress" role="status">QR frame 1 of '+signingQrSession.qrImages.length+'</p>'+
  '<button type="button" id="jade-qr-toggle" onclick="bc1q21JadeQrToggle()">Pause QR animation</button>'+
  '<script>(function(){const images='+JSON.stringify(signingQrSession.qrImages)+';let index=0;let timer;'+
  'function show(){document.getElementById("jade-unsigned-qr").src=images[index];document.getElementById("jade-qr-progress").textContent="QR frame "+(index+1)+" of "+images.length;}'+
  'function start(){timer=setInterval(function(){index=(index+1)%images.length;show();},1500);}'+
  'window.bc1q21JadeQrToggle=function(){const button=document.getElementById("jade-qr-toggle");if(timer){clearInterval(timer);timer=null;button.textContent="Resume QR animation";}else{start();button.textContent="Pause QR animation";}};start();})();<\\/script></section>';
 return '<section aria-labelledby="offline-signing-title">'+
 '<h2 id="offline-signing-title">Release Bitcoin using your offline wallet</h2>'+
 '<p>Review the gift and release details here. Your recovery words stay on your offline hardware wallet; never enter them into this website.</p>'+
 '<ol><li>Confirm the gift output, unlock condition, receiving address and fee.</li>'+
 '<li>After independent verification and approval, display the unsigned transaction QR to Jade.</li>'+
 '<li>Review and approve on Jade, then scan its signed QR return.</li>'+
 '<li>Verify the signed transaction before any separately authorized broadcast.</li></ol>'+
 (signingQrSession===null?'<p role="status">Offline QR signing is not available for this gift yet.</p>':'<p role="status">Verified unsigned QR frames prepared for offline Jade signing. No Bitcoin broadcast.</p>')+
 '<button id="sign" disabled aria-disabled="true" type="button">Prepare offline signing QR</button>'+
 qrDisplay+
 '<details><summary>Why is release unavailable?</summary><ul>'+reasons+'</ul></details>'+
 '<p><small>Professional regtest prototype only. No transaction is signed or broadcast by this page.</small></p>'+
 '</section>';
}
