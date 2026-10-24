// Successful isolated Option B path with a deterministic two-output funding
// transaction and a credentialed LOOPBACK Core fixture (NOT live Bitcoin Core).
// No Jade, mnemonic, broadcast, or production funds.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {digestProfessionalGiftBinding} from './public-gift-binding-commitment.mjs';
import {prepareOptionBFundedLinkReview} from './option-b-funded-link-review.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const dates=['2031-01-15','2031-02-15'];
const handoffs=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}));
const tx=new bitcoin.Transaction();tx.version=2;tx.addInput(Buffer.alloc(32,1),0);
for(const h of handoffs)tx.addOutput(Buffer.from(h.fundingScriptPubKeyHex,'hex'),100000);
const tip='a'.repeat(64),block='b'.repeat(64);
const binding={network:'regtest',fundingTxid:tx.getId(),
 releaseOutputs:handoffs.map((h,index)=>({index,vout:index,sats:100000,
  scriptPubKeyHex:h.fundingScriptPubKeyHex}))};
const fundingAddress='bcrt1q'+'q'.repeat(38);
const destination=bitcoin.payments.p2wpkh({pubkey:Buffer.from(secp256k1.getPublicKey(
 Buffer.from([...Buffer.alloc(31),10]),true)),network:bitcoin.networks.regtest});
const funding={fundingTxHex:tx.toHex(),vout:0,expectedTxid:tx.getId(),expectedSats:100000,
 masterFingerprintHex,derivationPath:handoffs[0].derivationPath,
 destinationScriptHex:destination.output.toString('hex'),destinationSats:99000};
const approvedIntent={destinationScriptHex:funding.destinationScriptHex,
 destinationSats:99000,expectedTxid:tx.getId(),vout:0,expectedSats:100000,
 locktime:handoffs[0].locktime,signerPubkeyHex:handoffs[0].signerPubkeyHex};
const authorization='Basic '+Buffer.from('disposable:regtest-fixture').toString('base64');
test('Option B gift link -> two bound outputs -> Core fixture -> review -> one-use unsigned QR',async()=>{
 const server=http.createServer((req,res)=>{
  assert.equal(req.headers.authorization,authorization);
  let body='';req.on('data',part=>body+=part);
  req.on('end',()=>{
   const {method,params}=JSON.parse(body);
   const vout=params[1]??0;
   const results={
    getbestblockhash:tip,
    getblockchaininfo:{chain:'regtest',bestblockhash:tip,blocks:110},
    getrawtransaction:{txid:tx.getId(),blockhash:block,vout:binding.releaseOutputs.map(r=>({
     n:r.vout,value:r.sats/1e8,scriptPubKey:{hex:r.scriptPubKeyHex}
    }))},
    getblockheader:params[0]===tip?{hash:tip,height:110,mediantime:2100000000}:{hash:block,confirmations:5},
    gettxout:{bestblock:tip,confirmations:5,value:0.001,
     scriptPubKey:{hex:binding.releaseOutputs[vout].scriptPubKeyHex}}
   };
   assert.ok(Object.hasOwn(results,method),'Unexpected RPC '+method);
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({result:results[method],error:null}));
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const flow=await prepareOptionBFundedLinkReview({
   giftUrl:'https://example.invalid/gift/'+fundingAddress+'?interval=month',
   published:{accountXpub,masterFingerprintHex,firstDate:dates[0],interval:'month',
    outputScriptsHex:handoffs.map(h=>h.fundingScriptPubKeyHex)},
   locatorMapping:{fundingAddress,releaseScriptsHex:handoffs.map(h=>h.fundingScriptPubKeyHex)},
   binding,expectedBindingDigest:digestProfessionalGiftBinding(binding),
   authorization,port:server.address().port,releaseIndex:0,publicHandoff:handoffs[0],
   funding,approvedIntent
  });
  assert.equal(flow.verifiedReleaseCount,2);
  assert.deepEqual(flow.publishedReleases.map(x=>x.date),dates);
  assert.equal(flow.coreFundingVerifiedAtReviewCreation,true);
  assert.equal(flow.creatorAuthenticated,false);
  assert.equal(flow.recipientCommitmentProvenanceVerified,false);
  const review=flow.beneficiary;
  assert.equal(review.reviewCompleted(),false);
  review.approve({acknowledged:true,confirmedDigest:review.review().psbtSha256});
  await review.finalizeReview();
  const qr=await review.exportQrFrames({frameCount:8});
  assert.equal(qr.frames.length,8);
  assert.ok(qr.frames.every(x=>x.startsWith('ur:crypto-psbt/')));
  assert.equal(qr.signed,false);assert.equal(qr.broadcast,false);
  await assert.rejects(review.exportQrFrames(),/already consumed/);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
