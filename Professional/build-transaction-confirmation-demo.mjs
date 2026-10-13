// Offline, static, public-only regtest confirmation demonstration.
// No real signing, no network, no wallet secrets. Human approval remains a
// prototype UI acknowledgment, not a security boundary against compromised UI.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { createProfessionalTransactionConfirmation } from './transaction-confirmation.mjs';
const pub=n=>Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),n]),true));
const signer=pub(9);
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(110),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
 bitcoin.opcodes.OP_DROP,signer,bitcoin.opcodes.OP_CHECKSIG]);
const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:signer.toString('hex'),locktime:110,redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address};
const prev=new bitcoin.Transaction();prev.version=2;prev.addInput(Buffer.alloc(32,1),0);prev.addOutput(payment.output,100000);
const destination=bitcoin.payments.p2wpkh({pubkey:pub(10),network:bitcoin.networks.regtest});
const funding={fundingTxHex:prev.toHex(),vout:0,expectedTxid:prev.getId(),expectedSats:100000,
 masterFingerprintHex:'00000009',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:destination.output.toString('hex'),destinationSats:99000};
const approved={destinationScriptHex:funding.destinationScriptHex,destinationSats:99000,expectedTxid:funding.expectedTxid,
 vout:0,expectedSats:100000,locktime:110,signerPubkeyHex:handoff.signerPubkeyHex};
const record=createProfessionalTransactionConfirmation(handoff,funding,approved);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=[
 ['Network',record.network],['Funding transaction',record.fundingTxid],['Funding output',record.fundingVout],
 ['Input',record.inputSats+' sats'],['Receiving address',record.destinationAddress],
 ['Recipient payout',record.payoutSats+' sats'],['Network fee',record.feeSats+' sats'],
 ['Unlock block height',record.locktime],['Signer public key',record.signerPubkeyHex],
 ['Unsigned PSBT SHA-256',record.psbtSha256]
].map(([name,value])=>'<dt>'+escape(name)+'</dt><dd>'+escape(value)+'</dd>').join('');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bc1q21 Professional — regtest confirmation demo</title><style>
body{font:16px system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;color:#18212b;background:#fafbfc}
h1{font-size:1.5rem}.warning{background:#fff2d8;border:2px solid #9d6300;padding:1rem;border-radius:8px}
dl{display:grid;grid-template-columns:minmax(130px,1fr) 2fr;gap:12px;background:white;padding:1rem;border:1px solid #ccd2d9;border-radius:8px}
dt{font-weight:700}dd{margin:0;overflow-wrap:anywhere}label{display:block;margin:1rem 0}
input[type=text]{width:100%;box-sizing:border-box;padding:.7rem;font:inherit}
button{padding:.7rem 1.2rem;font:inherit}button:disabled{opacity:.45}#result{font-weight:700}
</style></head><body><h1>bc1q21 Professional — transaction confirmation</h1>
<p class="warning"><strong>DISPOSABLE REGTEST DEMO ONLY.</strong> No real Bitcoin, no signing, no broadcast, no seed phrases. Approval on this page is not a trusted hardware-signing confirmation.</p>
<p>Check the actual transaction details below. Viewing this page does not approve anything.</p><dl>${rows}</dl>
<form id="approval" autocomplete="off"><label>Type the full unsigned PSBT SHA-256 shown above to confirm this exact test transaction
<input id="digest" type="text" spellcheck="false" autocomplete="off" maxlength="64" required aria-label="Confirm unsigned PSBT fingerprint"></label>
<label><input id="ack" type="checkbox"> I have independently reviewed the destination, payout, fee and unlock block height.</label>
<button id="confirm" type="submit" disabled>Approve this regtest demonstration</button></form>
<p id="result" role="status" aria-live="polite">Not approved.</p>
<script>
'use strict';
const expected=${JSON.stringify(record.psbtSha256)};
const digest=document.getElementById('digest'),ack=document.getElementById('ack'),
button=document.getElementById('confirm'),result=document.getElementById('result');
let approved=false;
function refresh(){approved=false;button.disabled=!(ack.checked&&digest.value.trim()===expected);
result.textContent='Not approved.';}
digest.addEventListener('input',refresh);ack.addEventListener('change',refresh);
document.getElementById('approval').addEventListener('submit',event=>{
 event.preventDefault();if(button.disabled||!ack.checked||digest.value.trim()!==expected){refresh();return;}
 approved=true;result.textContent='REGTEST DEMO ACKNOWLEDGED. No signing or broadcasting performed.';
});
</script></body></html>`;
const file=process.argv[2]||'Professional/synthetic-transaction-confirmation.html';
writeFileSync(file,html);
console.log('Created offline regtest-only confirmation demo:',file,'PSBT SHA-256:',record.psbtSha256);
