// Offline Professional-only Option B renderer: produces a gift-specific static
// recipient page from the script-verified view model. No network or secrets.
// This is not a production HTTP route and never authorizes spending.
import {readFileSync} from 'node:fs';
import {buildGiftSpecificOptionBView} from './gift-specific-option-b-view.mjs';

function escapeHtml(v) {
 return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function renderOptionBRecipientPage(url,published) {
 const view=buildGiftSpecificOptionBView(url,published);
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
  'Public schedule demonstration; no real Bitcoin.');
 html=html.replace('These are known public synthetic fixtures from our isolated regtest work—not live balances, spendable UTXO discoveries, or dates derived from the recipient\'s real gift.',
  'These dates match supplied public scripts, but this offline page does not establish on-chain funding, confirmations, or spendability. Anyone with the link and published schedule can view the dates.');
 html=html.replace('This prototype never queries that address or assumes possession of it authorizes spending.',
  'This prototype never queries that address or assumes possession of it authorizes spending.');
 // The template uses a query-string locator; the caller can open this generated
 // static page with the public gift address in ?a=... to display the locator.
 return html;
}
