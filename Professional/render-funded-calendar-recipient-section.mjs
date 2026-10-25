// Static read-only rendering of a trusted-Core-reviewed gift view.
// No browser-side RPC, key material, PSBT creation or broadcast.
import assert from 'node:assert/strict';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderFundedCalendarRecipientSection(view) {
 assert.equal(view?.format,'bc1q21-professional-funded-calendar-recipient-view-v1');
 assert.equal(view.network,'regtest');
 assert.equal(view.coreFundingVerifiedAtReviewCreation,true);
 assert.equal(view.canSign,false);assert.equal(view.canBroadcast,false);
 assert.equal(view.canExportSigningQr,false);
 assert.ok(Array.isArray(view.releases)&&view.releases.length===view.releaseCount);
 const rows=view.releases.map((r,i)=>{
  assert.equal(r.index,i);assert.match(r.date,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isSafeInteger(r.sats)&&r.sats>0);
  assert.equal(r.confirmedUnspentAtReview,true);
  return '<tr><td>'+esc(i+1)+'</td><td>'+esc(r.date)+'</td><td>'+esc(r.sats.toLocaleString('en-US'))+
   ' sats</td><td>Confirmed unspent at review; refresh required</td></tr>';
 }).join('');
 return '<section aria-label="Verified regtest gift release schedule">'+
  '<h2>Gift release schedule</h2>'+
  '<p>Bitcoin Core confirmed these funded outputs were unspent at review time. This is not a live balance or a creator identity check.</p>'+
  '<p><strong>'+esc(view.releaseCount)+' releases · '+esc(view.totalScheduledSats.toLocaleString('en-US'))+' sats scheduled</strong></p>'+
  '<table><thead><tr><th>Release</th><th>Unlock date (UTC)</th><th>Funded amount</th><th>Evidence</th></tr></thead><tbody>'+rows+'</tbody></table>'+
  '<p role="status">Offline signing unavailable from this read-only page. No Bitcoin broadcast.</p></section>';
}
