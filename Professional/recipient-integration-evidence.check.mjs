// Regression for the real evidence branch (not just public schedule display).
// Caller-supplied observations can establish consistency, never trusted RPC
// provenance, beneficiary authorization or permission to issue signing QR.
import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {inspectProfessionalRecipientIntegration} from './recipient-integration-boundary.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const firstDate='2031-01-15';
const handoff=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex:0,locktime:retailDateToCltvTimestamp(firstDate)});
const published={accountXpub,masterFingerprintHex,firstDate,interval:'month',outputScriptsHex:[handoff.fundingScriptPubKeyHex]};
// The xpub derivation includes extra public metadata; the release gate accepts
// only the exact six-field public handoff schema.
const publicHandoff=Object.fromEntries(['version','network','signerPubkeyHex','locktime','redeemScriptHex','fundingAddress'].map(k=>[k,handoff[k]]));
const giftUrl='https://example.invalid/gift/'+handoff.fundingAddress+'?interval=month';
const prev=new bitcoin.Transaction();prev.version=2;prev.addInput(Buffer.alloc(32,1),0);
prev.addOutput(Buffer.from(handoff.fundingScriptPubKeyHex,'hex'),100000);
const funding={fundingTxHex:prev.toHex(),vout:0,expectedTxid:prev.getId(),expectedSats:100000,
 masterFingerprintHex,derivationPath:[0x80000054,0x80000000,0x80000000,1,0],
 destinationScriptHex:'0014'+'ab'.repeat(20),destinationSats:99000};
const checkpoint={version:1,chain:'regtest',fundingTxid:prev.getId(),vout:0,
 amountSats:100000,scriptPubKeyHex:handoff.fundingScriptPubKeyHex,
 fundingBlockHash:'b'.repeat(64),fundingBlockHeight:100};
const coreEvidence={chainInfo:{chain:'regtest'},
 transaction:{txid:prev.getId(),blockhash:checkpoint.fundingBlockHash,
  vout:[{n:0,value:0.001,scriptPubKey:{hex:checkpoint.scriptPubKeyHex}}]},
 blockHeader:{hash:checkpoint.fundingBlockHash,height:100,confirmations:2},
 txout:{value:0.001,confirmations:2,scriptPubKey:{hex:checkpoint.scriptPubKeyHex}}};
const evidence={giftUrl,published,publicHandoff,funding,checkpoint,coreEvidence,
 chainTip:{chain:'regtest',blocks:110,bestblockhash:'c'.repeat(64)}};

test('calendar-based CLTV checks median time past, but never authorizes QR',()=>{
 const before=inspectProfessionalRecipientIntegration({...evidence,chainTip:{...evidence.chainTip,mediantime:handoff.locktime}});
 assert.equal(before.chainEvidenceInspected,true);
 assert.equal(before.canExportSigningQr,false);
 assert.match(before.blockers.join(' '),/CLTV timestamp has not matured/);
 const after=inspectProfessionalRecipientIntegration({...evidence,chainTip:{...evidence.chainTip,mediantime:handoff.locktime+1}});
 assert.equal(after.chainEvidenceInspected,true);
 assert.equal(after.chainProvenanceAuthenticated,false);
 assert.equal(after.beneficiaryAuthorized,false);
 assert.equal(after.ready,false);
 assert.equal(after.canExportSigningQr,false);
 assert.equal(after.canSign,false);
 assert.equal(after.canBroadcast,false);
 assert.match(after.blockers.join(' '),/Trusted Bitcoin Core RPC provenance/);
});
test('calendar locktime rejects missing median time past',()=>{
 assert.throws(()=>inspectProfessionalRecipientIntegration(evidence),/median time past/);
});
test('inconsistent chain evidence fails closed',()=>{
 assert.throws(()=>inspectProfessionalRecipientIntegration({...evidence,
  checkpoint:{...checkpoint,amountSats:100001}}));
});
