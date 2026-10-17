// Offline bc1q21 Professional recipient review: public fixture only.
// Uses precomputed public xpub, public candidate and descriptors.
// Intentionally rejects all secrets and does not make network requests.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {verifyWatchOnlyGift} from './verify-watchonly-xpub-gift.mjs';

const [input,output]=process.argv.slice(2);
assert.ok(input&&output,'Input public fixture and output HTML required');
const data=JSON.parse(readFileSync(input,'utf8'));
assert.equal(data.format,'bc1q21-professional-watchonly-review-v1');
assert.equal(data.network,'regtest');
assert.equal(data.privateKeysIncluded,false);
assert.ok(data.locator && data.locator.fundingAddress);
assert.ok(Array.isArray(data.candidates) && Array.isArray(data.descriptors));
const status=verifyWatchOnlyGift({
 locator:data.locator,candidates:data.candidates,
 descriptors:data.descriptors,accountXpub:data.accountXpub
});
assert.equal(status.status,'watch-only-script-match',status.reason);
assert.equal(status.authenticated,false);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=status.matches.map(m=>`<tr><td>${m.index+1}</td><td>${m.sats.toLocaleString('en-US')}</td><td>${m.locktime}</td><td><code>${esc(m.txid)}:${m.vout}</code></td><td>Public script matches</td></tr>`).join('');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'"><title>bc1q21 Professional gift-specific public review</title><style>body{font:16px system-ui;background:#f4f7fb;color:#192a3e;max-width:1020px;margin:25px auto;padding:20px}header{font-size:1.5rem;color:#07568e;border-bottom:3px solid #07568e;padding:14px 0}article{background:white;padding:18px;border:1px solid #d1dfeb;border-radius:9px;margin:16px 0}.warning{border-left:4px solid #b88015;background:#fff0d7;padding:12px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #dde5ee}code{font-size:.75rem;word-break:break-all}button{padding:14px;border:0;border-radius:6px;background:#aab7c4;color:white}</style></head><body><header>bc1q21 Professional · Offline prototype</header><h1>Your Gift Overview</h1><p class="warning">Public-only demonstration. A matching xpub and locking script do NOT authenticate this gift-card link, xpub provenance, beneficiary ownership, on-chain funding, or recovered dates. No real Bitcoin.</p><article><h2>Gift-specific link</h2><p><code>/gift/${esc(data.locator.fundingAddress)}</code></p><p>Public locator only, not authorization.</p></article><article><h2>Public wallet output matching</h2><p>${status.matches.length} outputs matched a supplied watch-only public account key and P2SH CLTV script descriptors.</p><div style="overflow:auto"><table><thead><tr><th>Release</th><th>Satoshis</th><th>Lock height</th><th>Output</th><th>Public status</th></tr></thead><tbody>${rows}</tbody></table></div></article><article><h2>Claim release with Jade</h2><p>This step requires gift authentication, schedule recovery and offline PSBT signing integration. It is deliberately disabled.</p><button disabled>Sign matured release with offline wallet</button><p>Never type 12 recovery words into this recipient page.</p></article></body></html>`;
assert.ok(!html.includes(data.accountXpub));
assert.ok(!/<textarea|<input|<script/i.test(html));
writeFileSync(output,html,{mode:0o600});
console.log('PASS public-only gift-specific review built for',status.matches.length,'script-matched outputs');
console.log('NOT PROVEN: gift link and xpub provenance, true wallet restore, first-date decryption, Bitcoin broadcast');
