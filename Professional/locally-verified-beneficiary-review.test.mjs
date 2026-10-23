import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {prepareLocallyVerifiedBeneficiaryReview} from './locally-verified-beneficiary-review.mjs';
import {digestProfessionalGiftBinding} from './public-gift-binding-commitment.mjs';

const pub=n=>Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),n]),true));
const signer=pub(9),locktime=110,tip='a'.repeat(64),block='b'.repeat(64);
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
 bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,signer,bitcoin.opcodes.OP_CHECKSIG]);
const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:signer.toString('hex'),locktime,
 redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address};
const tx=new bitcoin.Transaction();tx.version=2;tx.addInput(Buffer.alloc(32,1),0);tx.addOutput(payment.output,100000);
const destination=bitcoin.payments.p2wpkh({pubkey:pub(10),network:bitcoin.networks.regtest});
const funding={fundingTxHex:tx.toHex(),vout:0,expectedTxid:tx.getId(),expectedSats:100000,
 masterFingerprintHex:'00000009',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:destination.output.toString('hex'),destinationSats:99000};
const intent={destinationScriptHex:funding.destinationScriptHex,destinationSats:99000,
 expectedTxid:funding.expectedTxid,vout:0,expectedSats:100000,locktime,
 signerPubkeyHex:handoff.signerPubkeyHex};
const binding={network:'regtest',fundingTxid:tx.getId(),releaseOutputs:[{
 index:0,vout:0,sats:100000,scriptPubKeyHex:payment.output.toString('hex')
}]};
const authorization='Basic '+Buffer.from('local-fixture:disposable').toString('base64');
async function withCore({spent=false,wrongNetwork=false,changedScript=false}={},run) {
 const server=http.createServer((req,res)=>{
  if(req.headers.authorization!==authorization){res.writeHead(401);res.end();return;}
  let body='';
  req.on('data',part=>body+=part);
  req.on('end',()=>{
   const {method,params}=JSON.parse(body);
   const results={
    getbestblockhash:tip,
    getblockchaininfo:{chain:wrongNetwork?'main':'regtest',bestblockhash:tip,blocks:110},
    getrawtransaction:{txid:tx.getId(),blockhash:block,vout:[{
     n:0,value:0.001,scriptPubKey:{hex:payment.output.toString('hex')}
    }]},
    getblockheader:params[0]===tip?{hash:tip,height:110,mediantime:1800000000}:{
     hash:block,confirmations:5
    },
    gettxout:spent?null:{bestblock:tip,confirmations:5,value:0.001,
     scriptPubKey:{hex:changedScript?'0014'+'22'.repeat(20):payment.output.toString('hex')}}
   };
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({result:results[method],error:null}));
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await run(server.address().port);}
 finally{await new Promise(resolve=>server.close(resolve));}
}
const start=port=>prepareLocallyVerifiedBeneficiaryReview({
 port,authorization,binding,expectedBindingDigest:digestProfessionalGiftBinding(binding),releaseIndex:0,publicHandoff:handoff,funding,approvedIntent:intent
});

test('credentialed Core evidence is collected internally before one-time approval',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  assert.equal(typeof flow.exportQrFrames,'undefined');
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  const result=await flow.finalizeReview();
  assert.equal(result.exactApprovedPsbtMatched,true);
  assert.equal(result.canExportSigningQr,false);
  assert.equal(result.canSign,false);
  assert.equal(result.canBroadcast,false);
 });
});

test('wrong RPC credentials, wrong network and spent gift output fail closed',async()=>{
 await withCore({},async port=>{
  await assert.rejects(prepareLocallyVerifiedBeneficiaryReview({
   port,authorization:'Basic invalid',binding,expectedBindingDigest:digestProfessionalGiftBinding(binding),releaseIndex:0,
   publicHandoff:handoff,funding,approvedIntent:intent
  }),/rejected/);
 });
 await withCore({wrongNetwork:true},async port=>{
  await assert.rejects(start(port),/Regtest only/);
 });
 await withCore({spent:true},async port=>{
  await assert.rejects(start(port),/spent or unconfirmed/);
 });
});

test('missing or altered independently held gift commitment fails before Core access',async()=>{
 await withCore({},async port=>{
  await assert.rejects(prepareLocallyVerifiedBeneficiaryReview({
   port,authorization,binding,releaseIndex:0,publicHandoff:handoff,funding,approvedIntent:intent
  }),/Independent gift commitment/);
  await assert.rejects(prepareLocallyVerifiedBeneficiaryReview({
   port,authorization,binding,expectedBindingDigest:'f'.repeat(64),releaseIndex:0,
   publicHandoff:handoff,funding,approvedIntent:intent
  }),/differs from independently held commitment/);
 });
});

test('locally acquired Core script substitution fails before beneficiary approval',async()=>{
 await withCore({changedScript:true},async port=>{
  await assert.rejects(start(port),/Unspent script mismatch/);
 });
});

test('altered recipient gift binding fails even if the attacker supplies a new digest',async()=>{
 await withCore({},async port=>{
  const modified={...binding,releaseOutputs:[{...binding.releaseOutputs[0],
   scriptPubKeyHex:'0014'+'22'.repeat(20)}]};
  await assert.rejects(prepareLocallyVerifiedBeneficiaryReview({
   port,authorization,binding:modified,
   expectedBindingDigest:digestProfessionalGiftBinding(modified),
   releaseIndex:0,publicHandoff:handoff,funding,approvedIntent:intent
  }),/Gift output script mismatch/);
 });
});

test('trusted-local beneficiary facade cannot finalize or reapprove twice',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  const digest=flow.review().psbtSha256;
  flow.approve({acknowledged:true,confirmedDigest:digest});
  const result=await flow.finalizeReview();
  assert.equal(result.canExportSigningQr,false);
  await assert.rejects(flow.finalizeReview(),/already finalized/);
  assert.throws(()=>flow.approve({acknowledged:true,confirmedDigest:digest}),
   /already finalized/);
  assert.throws(()=>flow.revoke(),/already finalized/);
  assert.equal(typeof flow.exportQrFrames,'undefined');
  assert.equal(typeof flow.completeSignedReturn,'undefined');
 });
});

test('trusted-local failed finalization permanently consumes that review',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  await assert.rejects(flow.finalizeReview(),/Explicit fingerprint approval required/);
  assert.throws(()=>flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256}),
   /already finalized/);
  await assert.rejects(flow.finalizeReview(),/already finalized/);
 });
});
