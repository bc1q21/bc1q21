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
 const state={spent,changedScript,changedTip:false,failNextTipRead:false,tipReads:0};
 const server=http.createServer((req,res)=>{
  if(req.headers.authorization!==authorization){res.writeHead(401);res.end();return;}
  let body='';
  req.on('data',part=>body+=part);
  req.on('end',()=>{
   const {method,params}=JSON.parse(body);
   if(method==='getbestblockhash'){
    state.tipReads++;
    if(state.flipTipAtRead===state.tipReads)state.changedTip=true;
    if(state.failNextTipRead){
     state.failNextTipRead=false;
     res.writeHead(500,{'content-type':'application/json'});
     res.end(JSON.stringify({result:null,error:{code:-1,message:'Injected Core failure'}}));
     return;
    }
   }
   const results={
    getbestblockhash:state.changedTip?'c'.repeat(64):tip,
    getblockchaininfo:{chain:wrongNetwork?'main':'regtest',bestblockhash:tip,blocks:110},
    getrawtransaction:{txid:tx.getId(),blockhash:block,vout:[{
     n:0,value:0.001,scriptPubKey:{hex:payment.output.toString('hex')}
    }]},
    getblockheader:params[0]===tip?{hash:tip,height:110,mediantime:1800000000}:{
     hash:block,confirmations:5
    },
    gettxout:state.spent?null:{bestblock:tip,confirmations:5,value:0.001,
     scriptPubKey:{hex:state.changedScript?'0014'+'22'.repeat(20):payment.output.toString('hex')}}
   };
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({result:results[method],error:null}));
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await run(server.address().port,state);}
 finally{await new Promise(resolve=>server.close(resolve));}
}
const start=port=>prepareLocallyVerifiedBeneficiaryReview({
 port,authorization,binding,expectedBindingDigest:digestProfessionalGiftBinding(binding),releaseIndex:0,publicHandoff:handoff,funding,approvedIntent:intent
});

test('credentialed Core evidence is collected internally before one-time approval',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  assert.equal(typeof flow.exportQrFrames,'function');
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
  assert.equal(typeof flow.exportQrFrames,'function');
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

test('trusted-local review completion is private and cannot be forged or replayed',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  assert.equal(flow.reviewCompleted(),false);
  assert.equal(flow.canExportSigningQr,false);
  await assert.rejects(flow.finalizeReview(),/Explicit fingerprint approval required/);
  assert.equal(flow.reviewCompleted(),false);
  await assert.rejects(flow.finalizeReview(),/Trusted review already finalized/);
  assert.equal(typeof flow.exportQrFrames,'function');
 });
 await withCore({},async port=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  const result=await flow.finalizeReview();
  assert.equal(result.reviewFinalized,true);
  assert.equal(flow.reviewCompleted(),true);
  await assert.rejects(flow.finalizeReview(),/Trusted review already finalized/);
  assert.equal(typeof flow.exportQrFrames,'function');
 });
});

test('trusted QR export is single-use and only follows successful finalized review',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  await assert.rejects(flow.exportQrFrames(),/Successful beneficiary review required/);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
 await withCore({},async port=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  const result=await flow.exportQrFrames({frameCount:8});
  assert.equal(result.network,'regtest');
  assert.equal(result.psbtSha256,flow.review().psbtSha256);
  assert.equal(result.frames.length,8);
  assert.ok(result.frames.every(frame=>frame.startsWith('ur:crypto-psbt/')));
  assert.equal(result.signed,false);
  assert.equal(result.broadcast,false);
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
});

test('trusted QR export rejects spent output after approval and consumes attempt',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  await assert.rejects(flow.exportQrFrames({fragmentLength:10}),/Invalid fragment length/);
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
});

test('spent gift output after finalized approval prevents QR export permanently',async()=>{
 await withCore({},async(port,state)=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  state.spent=true;
  await assert.rejects(flow.exportQrFrames(),/spent or tip changed/);
  state.spent=false;
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
});

test('changed Core tip after finalized approval prevents QR export permanently',async()=>{
 await withCore({},async(port,state)=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  state.changedTip=true;
  await assert.rejects(flow.exportQrFrames(),/Chain tip changed since approval/);
  state.changedTip=false;
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
});

test('changed gift locking script after approval prevents QR export',async()=>{
 await withCore({},async(port,state)=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  state.changedScript=true;
  await assert.rejects(flow.exportQrFrames(),/locking script changed/);
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
});

test('concurrent QR export attempts never both succeed',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  const attempts=await Promise.allSettled([
   flow.exportQrFrames({frameCount:8}),flow.exportQrFrames({frameCount:8})
  ]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(attempts.filter(x=>x.status==='rejected').length,1);
  assert.match(attempts.find(x=>x.status==='rejected').reason.message,/already consumed/);
 });
});

test('invalid QR encoding options permanently consume approved export',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  await assert.rejects(flow.exportQrFrames({frameCount:0}),/Invalid frame count/);
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
});

test('failed beneficiary review cannot export QR even when supplied readiness flags',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  await assert.rejects(flow.finalizeReview(),/Explicit fingerprint approval required/);
  await assert.rejects(flow.exportQrFrames({
   approvalRecorded:true,reviewFinalized:true,canExportSigningQr:true
  }),/Successful beneficiary review required/);
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
});

test('transient Core failure during QR export consumes authorization',async()=>{
 await withCore({},async(port,state)=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  state.failNextTipRead=true;
  await assert.rejects(flow.exportQrFrames(),/Core|RPC|Injected|failed|rejected/i);
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
});

test('no signing or broadcast capability is exposed by the trusted QR handoff',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  const handoff=await flow.exportQrFrames({frameCount:8});
  assert.equal(handoff.signed,false);
  assert.equal(handoff.broadcast,false);
  assert.equal(typeof flow.sign,'undefined');
  assert.equal(typeof flow.broadcast,'undefined');
  assert.equal(typeof flow.completeSignedReturn,'undefined');
  assert.equal(typeof handoff.sign,'undefined');
  assert.equal(typeof handoff.broadcastTransaction,'undefined');
  assert.equal(Object.isFrozen(handoff),true);
 });
});

test('QR export fails closed if the Core tip changes after frame construction',async()=>{
 await withCore({},async(port,state)=>{
  const flow=await start(port);
  flow.approve({acknowledged:true,confirmedDigest:flow.review().psbtSha256});
  await flow.finalizeReview();
  const before=state.tipReads;
  // A changed tip during export must prevent frames being returned.
  // Flip on the final tip read after the three freshness tip reads.
  state.flipTipAtRead=before+4;
  await assert.rejects(flow.exportQrFrames({frameCount:8}),/Chain tip changed/);
  await assert.rejects(flow.exportQrFrames(),/QR export already consumed/);
 });
});
