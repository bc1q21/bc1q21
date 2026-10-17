// Render a gift-specific recipient review from already checked public evidence.
// Isolated regtest. Never accepts wallet secrets or enables signing/broadcast.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const [input,output]=process.argv.slice(2);
assert.ok(input&&output,'Supply bound public fixture and HTML path');
const d=JSON.parse(readFileSync(input,'utf8'));
assert.equal(d.format,'bc1q21-professional-watchonly-review-v1');
assert.equal(d.network,'regtest');
assert.equal(d.privateKeysIncluded,false);
assert.equal(d.fundingEvidence?.verifiedRegtestOutputs,24);
assert.equal(d.fundingEvidence?.snapshotHeight,122);
assert.equal(d.fundingEvidence?.fundingInputOriginConfirmed,true);
assert.equal(d.fundingEvidence?.recipientOwnershipAuthenticated,false);
assert.equal(d.fundingEvidence?.genuineRetailGiftLinkProven,false);
assert.equal(d.fundingEvidence?.scheduleRecovered,false);
assert.equal(d.descriptors.length,24);
const htmlSafe=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=d.descriptors.map((x,i)=>{
 assert.equal(x.index,i);assert.equal(x.path,"m/84'/0'/0'/1/"+i);
 assert.ok(d.candidates[0].outputs.some(y=>y.vout===x.vout&&y.sats===x.sats&&y.scriptPubKey===x.scriptPubKey));
 return `<tr><td>${i+1}</td><td>${x.sats.toLocaleString('en-US')}</td><td>${x.locktime}</td><td><code>${htmlSafe(d.fundingEvidence.fundingTxid)}:${x.vout}</code></td><td>Funded &amp; unspent at height 122</td></tr>`;
}).join('');
const body=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';connect-src 'none';form-action 'none';base-uri 'none'"><title>bc1q21 Professional — gift recipient review (regtest)</title><style>body{font:16px system-ui;max-width:1024px;margin:24px auto;padding:18px;background:#f3f7fb;color:#152c41}header{font-size:1.55rem;font-weight:bold;color:#07558d;border-bottom:3px solid #07558d;padding:14px}section{background:#fff;border:1px solid #d9e3ec;border-radius:9px;margin-top:18px;padding:20px}.warning{background:#fff0d6;border-left:4px solid #b58014;padding:13px;line-height:1.5}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid #e3e9ef}code{font-size:.73rem;word-break:break-all}button{background:#a0adba;color:#fff;border:0;border-radius:6px;padding:14px;font-weight:bold}p{line-height:1.5}</style></head><body><header>bc1q21 Professional · ISOLATED REGTEST</header><h1>Your Gift Overview</h1><p class="warning"><strong>Experimental gift-specific review, not a retail recipient gift.</strong> One disposable 24-output funding transaction was confirmed by Bitcoin Core. The funding input originated at the displayed public locator. That does NOT authenticate a real gift-card link, wallet ownership, user entitlement, release dates or the device recovery process.</p><section><h2>Gift link's public funding address</h2><p><code>${htmlSafe(d.locator.fundingAddress)}</code></p><p>Funding-input origin on the synthetic regtest transaction: verified. Recipient ownership: not verified.</p></section><section><h2>24 publicly verified Bitcoin outputs</h2><p>Each P2SH CLTV script matched a non-hardened signing key derived from the supplied public account xpub and a confirmed unspent Bitcoin Core regtest output at height 122.</p><div style="overflow:auto"><table><thead><tr><th>Release</th><th>Amount (sats)</th><th>Lock height (not date)</th><th>Outpoint</th><th>Verified evidence</th></tr></thead><tbody>${rows}</tbody></table></div></section><section><h2>Release using offline wallet</h2><p>The eventual recipient workflow will review a matured release, scan an unsigned PSBT on Jade, return the signed PSBT, verify it and optionally broadcast. This review does not implement any of those steps.</p><button disabled>Sign matured release with offline wallet — not connected</button><p>No seed-word entry, signing, network connections or broadcast are possible.</p></section></body></html>`;
assert.ok(!body.includes(d.accountXpub));
assert.ok(!/<input|<textarea|<script|https?:\/\//i.test(body));
writeFileSync(output,body,{mode:0o600});
console.log('PASS generated public-only recipient review bound to one actual 24-output regtest funding transaction');
console.log('BOUNDARY recipient ownership, retail gift link and encrypted dates not proven');
