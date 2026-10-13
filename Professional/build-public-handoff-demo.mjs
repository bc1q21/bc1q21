// Generate a read-only offline demonstration of the PUBLIC wallet handoff.
// Synthetic/regtest-only. No input fields, secrets, network, signing, or broadcasting.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'node:buffer';
import { prepareProfessionalReleaseFromPublicHandoff } from './public-funding-release-integration.mjs';
const pub=Buffer.from('032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd','hex');
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(110),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
 bitcoin.opcodes.OP_DROP,pub,bitcoin.opcodes.OP_CHECKSIG]);
const p2sh=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const publicHandoff={version:1,network:'regtest',signerPubkeyHex:pub.toString('hex'),
 locktime:110,redeemScriptHex:redeem.toString('hex'),fundingAddress:p2sh.address};
const funding=new bitcoin.Transaction();funding.version=2;funding.addInput(Buffer.alloc(32,1),0);
funding.addOutput(p2sh.output,100000);
const details={fundingTxHex:funding.toHex(),vout:0,expectedTxid:funding.getId(),
 expectedSats:100000,masterFingerprintHex:'e29ac13c',
 derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000};
const result=prepareProfessionalReleaseFromPublicHandoff(publicHandoff,details);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>bc1q21 Professional — public-only handoff demonstration</title>
<style>body{font:16px system-ui,sans-serif;background:#111b25;color:#f1f4f8;margin:0}main{max-width:720px;margin:2rem auto;padding:1.2rem}h1{font-size:1.5rem}p{line-height:1.5}section{border:1px solid #526071;padding:1rem;border-radius:8px;margin:1rem 0}code{overflow-wrap:anywhere}strong{color:#fff}.warning{background:#49371d;border:1px solid #d0a15c;padding:1rem;border-radius:8px}</style></head><body><main>
<h1>bc1q21 Professional — public-only wallet handoff</h1>
<p class="warning"><strong>SYNTHETIC / REGTEST / UNFUNDED TEST ONLY.</strong> This page contains only prebuilt public test data. Never enter seed words or private keys. No real Bitcoin, signing, broadcast, or network calls.</p>
<section><h2>1. Offline signer public information</h2><p>Compressed public key: <code>${escapeHtml(publicHandoff.signerPubkeyHex)}</code></p><p>CLTV block height: <strong>${publicHandoff.locktime}</strong></p></section>
<section><h2>2. Independently verified funding address</h2><p><code>${escapeHtml(result.fundingAddress)}</code></p><p>ScriptPubKey: <code>${escapeHtml(result.fundingScriptPubKeyHex)}</code></p></section>
<section><h2>3. Synthetic release transaction</h2><p>Input: ${result.transactionSummary.inputSats} sats; payout: ${result.transactionSummary.payoutSats} sats; fee: ${result.transactionSummary.feeSats} sats.</p><p>Unsigned PSBT: <strong>prepared and verified</strong>. Next hardware transport format: ${escapeHtml(result.nextEncoder)}.</p></section>
<p>This is a static demonstration, not a Jade Plus export/import integration. The public information above is a fixed synthetic fixture, not data extracted from your hardware wallet.</p>
</main></body></html>`;
const output=resolve(process.argv[2]??'Professional/synthetic-public-handoff-demo.html');
writeFileSync(output,html,{mode:0o600});console.log('Created public-only synthetic demo',output,html.length);
