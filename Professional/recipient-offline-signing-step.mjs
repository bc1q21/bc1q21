// Professional-only offline recipient signing UX fragment.
// This is a rendering boundary, NOT authorization or a PSBT producer.
// The actual QR session must originate from independently authenticated,
// gift-specific, mature and explicitly approved release evidence.
import assert from 'node:assert/strict';

const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderProfessionalOfflineSigningStep(integration) {
 assert.ok(integration&&integration.format==='bc1q21-professional-recipient-integration-v1',
  'Verified Professional integration model required');
 assert.equal(integration.network,'regtest','Regtest only');
 assert.equal(integration.canSign,false,'Signing permission must not be inferred from a gift link');
 assert.equal(integration.canBroadcast,false,'Broadcast permission must not be inferred from a gift link');
 assert.ok(Array.isArray(integration.blockers),'Release blockers required');
 const reasons=integration.blockers.map(x=>'<li>'+esc(x)+'</li>').join('');
 return '<section aria-labelledby="offline-signing-title">'+
 '<h2 id="offline-signing-title">Release Bitcoin using your offline wallet</h2>'+
 '<p>Review the gift and release details here. Your recovery words stay on your offline hardware wallet; never enter them into this website.</p>'+
 '<ol><li>Confirm the gift output, unlock condition, receiving address and fee.</li>'+
 '<li>After independent verification and approval, display the unsigned transaction QR to Jade.</li>'+
 '<li>Review and approve on Jade, then scan its signed QR return.</li>'+
 '<li>Verify the signed transaction before any separately authorized broadcast.</li></ol>'+
 '<p role="status">Offline QR signing is not available for this gift yet.</p>'+
 '<button type="button" disabled aria-disabled="true">Prepare offline signing QR</button>'+
 '<details><summary>Why is release unavailable?</summary><ul>'+reasons+'</ul></details>'+
 '<p><small>Professional regtest prototype only. No transaction is signed or broadcast by this page.</small></p>'+
 '</section>';
}
