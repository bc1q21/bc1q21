// Isolated Professional public-data rendering. No seed entry, network calls or signer.
// Builds a self-contained HTML review of verified, disposable Core UTXOs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const [input,output]=process.argv.slice(2);
assert.ok(input&&output,'Usage: node build-public-discovery-review.mjs <audit-json> <output-html>');
const record=JSON.parse(readFileSync(input,'utf8'));
assert.equal(record.format,'bc1q21-professional-public-regtest-outpoint-audit-v1');
assert.equal(record.network,'regtest');
assert.equal(record.snapshotHeight,121);
assert.equal(record.privateKeysIncluded,false);
assert.equal(record.giftLinkBindingProven,false);
assert.equal(record.encryptedFirstDateRecovered,false);
assert.equal(record.giftChainDiscoveryProven,false);
assert.equal(record.releases.length,4);
const encode=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
for(const [index,r] of record.releases.entries()){
 assert.equal(r.release,index+1);
 assert.equal(r.cltvBlockHeight,[130,140,150,160][index]);
 assert.equal(r.fundingSats,[12000,15000,18000,21000][index]);
 assert.equal(r.exampleFeeSats,1000);
 assert.equal(r.examplePayoutSats,r.fundingSats-1000);
 assert.equal(r.unspentAtSavedHeight,true);
 assert.equal(r.matureAtSavedHeight,false);
 assert.match(r.outpoint,/^[a-f0-9]{64}:\d+$/);
 assert.match(r.lockingScript,/^a914[a-f0-9]{40}87$/);
 assert.equal(r.signerPathPublicMetadata,`m/84'/0'/0'/1/${index}`);
}
const rows=record.releases.map(r=>`<tr><td>${r.release}</td><td>${r.fundingSats.toLocaleString('en-US')} sats</td><td>${r.cltvBlockHeight}</td><td><code>${encode(r.outpoint)}</code></td><td>Unspent at 121</td></tr>`).join('');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';connect-src 'none';form-action 'none';base-uri 'none'"><title>bc1q21 Professional — Public release discovery (regtest)</title><style>body{font:16px system-ui;margin:24px auto;padding:0 20px;max-width:1050px;background:#f4f7fb;color:#192f45}header{border-bottom:3px solid #075b91;padding:15px 0}h1{font-size:1.65rem}article{padding:18px;background:#fff;border:1px solid #cfdce8;border-radius:9px;margin:14px 0}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #e1e7ef;text-align:left;padding:11px}code{word-break:break-all;font-size:.76rem}button{padding:12px;border-radius:6px;background:#9aa7b5;color:#fff;border:0;cursor:not-allowed}p{line-height:1.5}.warn{background:#fff2da;padding:13px;border-left:4px solid #ba730b}.muted{color:#4d6073}</style></head><body><header><strong>bc1q21 Professional</strong> · isolated regtest</header><h1>Your Gift Overview — public verification example</h1><p class="warn"><b>DEMONSTRATION — NOT A RECIPIENT GIFT.</b> The four outputs below belong to four independently funded disposable test transactions, not a linked retail gift. No gift card link has been authenticated. No release dates were decrypted.</p><article><h2>Verified public outputs</h2><p>Bitcoin Core 28 regtest snapshot, block height 121. The following outpoints and scripts were independently verified against the saved node's UTXO set.</p><div style="overflow-x:auto"><table><thead><tr><th>Release</th><th>Funded</th><th>CLTV block</th><th>Public outpoint</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p>All four time-locks are still in the future relative to snapshot height 121. A separate, already completed hardware signing test validated their later acceptance on regtest.</p></article><article><h2>Offline claim flow</h2><p>The eventual gift-specific recipient page will prepare a public unsigned PSBT, display animated QR frames for Jade, receive the signed QR response, verify the transaction, and offer broadcast when mature. These features are <b>not connected</b> on this review page.</p><button disabled>Sign matured release with offline wallet (not connected)</button></article><article><h2>Recovery limitations</h2><p>Gift-link-to-output binding, original on-chain gift transaction discovery, encrypted first-date decryption and reconstruction of a 24-release schedule using the wallet's existing 12-word backup are <b>not yet proven</b>. This page never asks for wallet recovery words, private keys, or decryption secrets.</p><p class="muted">All content is packaged locally. No network or storage activity.</p></article></body></html>`;
assert.ok(!/<textarea|<input/i.test(html));
assert.ok(!/https?:\/\//i.test(html));
writeFileSync(output,html,{mode:0o600});
console.log('PASS isolated public-outpoint viewer:',record.releases.length,'independently checked public CLTV outputs; no secrets and no recipient gift-link claims');
