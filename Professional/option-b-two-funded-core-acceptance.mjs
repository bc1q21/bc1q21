// Real disposable Bitcoin Core regtest acceptance of Option B two-release gift.
// One genuinely funded transaction, two CLTV outputs, one independently
// retained *test* commitment digest. No Jade, seed, mainnet, or broadcast of spends.
// A locally copied digest does NOT establish creator-to-recipient authentication.
import assert from 'node:assert/strict';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {digestProfessionalGiftBinding} from './public-gift-binding-commitment.mjs';
import {prepareRecipientHeldOptionBReview} from './recipient-held-option-b-review.mjs';
import {renderOptionBRecipientPage} from './render-option-b-recipient-page.mjs';
import {verifyPublicRetailSchedule} from './public-retail-schedule-verify.mjs';
import {buildFundedCalendarGiftView} from './funded-calendar-recipient-view.mjs';

const port=Number(process.env.REGTEST_RPC_PORT||18443);
const authorization='Basic '+Buffer.from('professional:synthetic-only').toString('base64');
async function rpc(method,params=[],wallet=''){
 const body=JSON.stringify({jsonrpc:'1.0',id:'option-b-core',method,params});
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,
   path:wallet?'/wallet/'+encodeURIComponent(wallet):'/',method:'POST',
   headers:{authorization,'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
    let out='';res.on('data',b=>out+=b);res.on('end',()=>{try{
     const j=JSON.parse(out);if(j.error)reject(Error(method+': '+JSON.stringify(j.error)));
     else resolve(j.result);
    }catch(e){reject(e)}});
   });req.on('error',reject);req.end(body);
 });
}
for(let i=0;i<30;i++){try{await rpc('getblockchaininfo');break}catch(e){
 if(i===29)throw e;await new Promise(r=>setTimeout(r,1000));}}
assert.equal((await rpc('getblockchaininfo')).chain,'regtest');
const wallet='option-b-two-release-disposable';
await rpc('createwallet',[wallet]);
const mining=await rpc('getnewaddress',[],wallet);
await rpc('generatetoaddress',[120,mining]);
const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const dates=['2023-11-14','2023-12-14'];
const handoffs=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}));
assert.ok((await rpc('getblockheader',[(await rpc('getbestblockhash'))])).mediantime>
 handoffs[1].locktime,'Both regtest calendar releases must be mature');
const outputs=Object.fromEntries(handoffs.map((h,i)=>[h.fundingAddress,(i+1)*0.001]));
const txid=await rpc('sendmany',['',outputs],wallet);
await rpc('generatetoaddress',[1,mining]);
const tx=bitcoin.Transaction.fromHex((await rpc('gettransaction',[txid],wallet)).hex);
const fundingTxHex=tx.__toBuffer(undefined,undefined,false).toString('hex');
assert.equal(bitcoin.Transaction.fromHex(fundingTxHex).getId(),txid);
const binding={network:'regtest',fundingTxid:txid,releaseOutputs:handoffs.map((h,index)=>{
 const vout=tx.outs.findIndex(o=>Buffer.from(o.script).toString('hex')===h.fundingScriptPubKeyHex);
 assert.ok(vout>=0,'Funding must contain each scheduled script');
 return {index,vout,sats:tx.outs[vout].value,scriptPubKeyHex:h.fundingScriptPubKeyHex};
})};
assert.equal(new Set(binding.releaseOutputs.map(o=>o.vout)).size,2);
const digest=digestProfessionalGiftBinding(binding);
// Render the recipient's static page from the SAME funding binding and
// independently derived public schedule used by the live Core review.
const giftUrl='https://example.invalid/gift/'+'bcrt1q'+'q'.repeat(38)+'?interval=month';
const published={accountXpub,masterFingerprintHex,firstDate:dates[0],interval:'month',
 outputScriptsHex:handoffs.map(h=>h.fundingScriptPubKeyHex)};
// Verify every calendar date against public signer derivation AND every
// corresponding output of the one transaction observed from Bitcoin Core.
const calendar=verifyPublicRetailSchedule(published);
assert.equal(calendar.releaseCount,binding.releaseOutputs.length);
for(const release of calendar.releases){
 const funded=binding.releaseOutputs[release.index];
 assert.equal(release.fundingScriptPubKeyHex,funded.scriptPubKeyHex,
  'Published calendar date must derive the exact funded release script');
 assert.equal(Buffer.from(tx.outs[funded.vout].script).toString('hex'),
  release.fundingScriptPubKeyHex,'Actual funded transaction output differs from calendar');
 assert.equal(tx.outs[funded.vout].value,funded.sats);
 assert.equal(release.date,dates[release.index]);
}
const invalidSchedule={...published,outputScriptsHex:[...published.outputScriptsHex]};
invalidSchedule.outputScriptsHex[1]='a914'+'00'.repeat(20)+'87';
assert.throws(()=>verifyPublicRetailSchedule(invalidSchedule),
 'Changing a scheduled release script must invalidate calendar evidence');
const locatorMapping={fundingAddress:'bcrt1q'+'q'.repeat(38),
 releaseScriptsHex:handoffs.map(h=>h.fundingScriptPubKeyHex)};
const rendered=renderOptionBRecipientPage(giftUrl,published,locatorMapping);
assert.doesNotMatch(rendered,/recipientFingerprint|checkFingerprint|64-character gift fingerprint/);
for(const date of dates)assert.ok(rendered.includes('<td>'+date+'</td>'));
assert.match(rendered,/id="sign" disabled/);
assert.match(rendered,/No live funding or Bitcoin spending is established/);
const destination=bitcoin.payments.p2wpkh({pubkey:Buffer.from(secp256k1.getPublicKey(
 Buffer.from([...Buffer.alloc(31),10]),true)),network:bitcoin.networks.regtest});
const selected=binding.releaseOutputs[0];
const funding={fundingTxHex,vout:selected.vout,expectedTxid:txid,expectedSats:selected.sats,
 masterFingerprintHex,derivationPath:handoffs[0].derivationPath,
 destinationScriptHex:destination.output.toString('hex'),destinationSats:selected.sats-1000};
const approvedIntent={destinationScriptHex:funding.destinationScriptHex,
 destinationSats:funding.destinationSats,expectedTxid:txid,vout:selected.vout,
 expectedSats:selected.sats,locktime:handoffs[0].locktime,
 signerPubkeyHex:handoffs[0].signerPubkeyHex};
const fundingAddress='bcrt1q'+'q'.repeat(38);
const result=await prepareRecipientHeldOptionBReview({
 giftUrl:'https://example.invalid/gift/'+fundingAddress+'?interval=month',
 published:{accountXpub,masterFingerprintHex,firstDate:dates[0],interval:'month',
  outputScriptsHex:handoffs.map(h=>h.fundingScriptPubKeyHex)},
 locatorMapping:{fundingAddress,releaseScriptsHex:handoffs.map(h=>h.fundingScriptPubKeyHex)},
 binding,recipientFingerprint:digest,
 recipientAttestation:{independentChannel:true,recipientEnteredFingerprint:true},
 authorization,port,releaseIndex:0,
 publicHandoff:handoffs[0],funding,approvedIntent
});
assert.deepEqual(result.publishedReleases.map(r=>r.date),dates);
assert.equal(result.verifiedReleaseCount,2);
assert.equal(result.coreFundingVerifiedAtReviewCreation,true);
const recipientView=buildFundedCalendarGiftView({giftUrl,published,locatorMapping,binding,
 coreFundingVerifiedAtReviewCreation:result.coreFundingVerifiedAtReviewCreation});
assert.deepEqual(recipientView.releases.map(r=>r.date),dates);
assert.deepEqual(recipientView.releases.map(r=>r.sats),[100000,200000]);
assert.equal(recipientView.totalScheduledSats,300000);
assert.equal(recipientView.coreFundingVerifiedAtReviewCreation,true);
assert.equal(recipientView.creatorAuthenticated,false);
assert.equal(recipientView.canExportSigningQr,false);
assert.equal(recipientView.canBroadcast,false);
assert.throws(()=>buildFundedCalendarGiftView({giftUrl,published,locatorMapping,binding,
 coreFundingVerifiedAtReviewCreation:false}),/Trusted Core verification required/);
const alteredBinding=structuredClone(binding);
alteredBinding.releaseOutputs[1].scriptPubKeyHex='a914'+'00'.repeat(20)+'87';
assert.throws(()=>buildFundedCalendarGiftView({giftUrl,published,locatorMapping,
 binding:alteredBinding,coreFundingVerifiedAtReviewCreation:true}));
console.log('PASS_FUNDED_CALENDAR_RECIPIENT_READONLY_VIEW',JSON.stringify({
 releases:recipientView.releaseCount,totalScheduledSats:recipientView.totalScheduledSats,
 creatorAuthenticated:false,broadcast:false}));
assert.equal(result.recipientFingerprintCompared,true);
assert.equal(result.independentChannelAcknowledged,true);
assert.equal(result.creatorAuthenticated,false);
assert.equal(result.recipientCommitmentProvenanceVerified,false);
const review=result.beneficiary;
review.approve({acknowledged:true,confirmedDigest:review.review().psbtSha256});
await review.finalizeReview();
const qr=await review.exportQrFrames({frameCount:8});
assert.equal(qr.frames.length,8);
assert.ok(qr.frames.every(f=>f.startsWith('ur:crypto-psbt/')));
assert.equal(qr.signed,false);assert.equal(qr.broadcast,false);
await assert.rejects(review.exportQrFrames(),/already consumed/);
console.log('PASS: genuine two-output funded Core regtest Option B link -> full-output checks -> review -> one-use unsigned QR. No spend broadcast. Recipient acknowledgement simulated; creator identity and delivery provenance NOT verified.');
