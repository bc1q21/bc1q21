// Offline Professional-only Option B renderer: produces a gift-specific static
// recipient page from the script-verified view model. No network or secrets.
// This is not a production HTTP route and never authorizes spending.
import {readFileSync} from 'node:fs';
import {buildGiftSpecificOptionBView} from './gift-specific-option-b-view.mjs';
import {mapProfessionalGiftLocatorToSchedule} from './option-b-explicit-link-map.mjs';
import {inspectProfessionalRecipientIntegration} from './recipient-integration-boundary.mjs';
import {renderProfessionalOfflineSigningStep} from './recipient-offline-signing-step.mjs';

function escapeHtml(v) {
 return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function renderOptionBRecipientPage(url,published,commitment) {
 // An original gift-card funding locator requires explicit public script mapping;
 // the earlier prototype used the first CLTV release address instead.
 const integration=inspectProfessionalRecipientIntegration({giftUrl:url,published,commitment});
 const mapped=commitment===undefined?null:mapProfessionalGiftLocatorToSchedule(url,published,commitment);
 const view=mapped?{fundingAddress:mapped.giftLocatorAddress,releases:mapped.releases,releaseCount:mapped.releaseCount}:
  buildGiftSpecificOptionBView(url,published);
 let html=readFileSync(new URL('./recipient-gift-specific-prototype.html',import.meta.url),'utf8');
 const rows=view.releases.map(release=>
  '<tr><td>'+escapeHtml(release.index+1)+'</td><td>'+escapeHtml(release.date)+
  '</td><td colspan="2">Scheduled (chain status not checked)</td></tr>').join('\n');
 html=html.replace(/<tbody>[\s\S]*?<\/tbody>/,
  '<tbody>'+rows+'</tbody>');
 html=html.replace('<th>Unlock height</th><th>Amount</th><th>Current status</th>',
  '<th>Release date (UTC)</th><th colspan="2">Status</th>');
 html=html.replace('<div class="big">0.00066000 BTC</div>',
  '<div class="big">'+escapeHtml(view.releaseCount)+' scheduled releases</div>');
 html=html.replace('66,000 disposable regtest satoshis in four example releases',
  'Dates verified against supplied public CLTV scripts; no balance or funding claim');
 html=html.replace('Fictional gift and wallet address. No real Bitcoin.',
  'Gift-specific public schedule, generated offline from supplied script-verified metadata. No live funding or Bitcoin spending is established.');
 html=html.replace('These are known public synthetic fixtures from our isolated regtest work—not live balances, spendable UTXO discoveries, or dates derived from the recipient\'s real gift.',
  'These dates match supplied public scripts, but this offline page does not establish on-chain funding, confirmations, or spendability. Anyone with the link and published schedule can view the dates.');
 html=html.replace('The four regtest spends have been tested independently.',
  'Offline regtest signing has been tested independently.');
 html=html.replace('This prototype does not yet connect a gift link to verified on-chain release discovery, unsigned PSBT construction, offline QR signing, or broadcasting.',
  'This public schedule view does not establish live on-chain funding, release discovery, unsigned PSBT construction, offline QR signing, or broadcasting.');
 html=html.replace('This is the gift-specific recipient page reached through a gift card\'s link or QR code. It is not the general bc1q21 homepage.',
  'This is an offline-generated Professional gift-specific schedule page. Publishing and QR-link routing are not yet enabled.');
 html=html.replace('A real gift link will supply a public funding-address locator.',
  'The verified gift address is embedded in this generated page.');
 html=html.replace('This prototype never queries that address or assumes possession of it authorizes spending.',
  'This prototype never queries that address or assumes possession of it authorizes spending.');
 // Replace the mock signing section with the actual fail-closed Professional
 // integration status. No PSBT or signing QR is issued by this renderer.
 // Explain the independent fingerprint handoff without asking for a secret
 // or pretending a static offline page has authenticated its sender.
 const recipientFingerprintGuide='<section aria-label="Independent gift fingerprint check">'+
  '<h2>Check your gift fingerprint</h2>'+
  '<p>Ask the gift creator to send you the complete 64-character gift fingerprint '+
  'through a channel you already trust, separately from this website and gift link.</p>'+
  '<p>Keep that message. When the release review requests your fingerprint, '+
  'enter the one from your independently retained message—not a fingerprint '+
  'copied from this page.</p>'+
  '<p><strong>Important:</strong> Matching fingerprints can detect changes to '+
  'the funded gift details. A match alone does not prove who sent the message '+
  'or authorize Bitcoin spending.</p>'+
  '<p>This offline schedule page cannot check the fingerprint, confirm '+
  'funding, approve a release, or generate a signing QR.</p></section>';
 const signingSection=recipientFingerprintGuide+renderProfessionalOfflineSigningStep(integration);
 const signingStart=html.indexOf('<section><h2>Release payments — offline signer</h2>');
 const signingEnd=html.indexOf('</section>',signingStart);
 if(signingStart<0||signingEnd<0) throw Error('Recipient signing section missing');
 html=html.slice(0,signingStart)+signingSection+html.slice(signingEnd+'</section>'.length);
 // The removed mock section owned the old explain button; do not leave a
 // dangling event listener that breaks the generated page on load.
 html=html.replace("document.getElementById('explain').addEventListener('click',()=>{",
  "document.getElementById('explain')?.addEventListener('click',()=>{");
 // Bind the verified public gift address to this generated page rather than
 // trusting a different address supplied later in a viewer's query string.
 html=html.replace("const value=params.get('a')||params.get('address')||'';",
  'const value='+JSON.stringify(view.fundingAddress)+';');
 return html;
}
