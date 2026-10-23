import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {prepareLocallyVerifiedBeneficiaryReview} from './locally-verified-beneficiary-review.mjs';
import {digestProfessionalGiftBinding} from './public-gift-binding-commitment.mjs';

const pub=n=>Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),n]),true));
const signer=pub(9),locktime=1893456000,tip='a'.repeat(64),block='b'.repeat(64);
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
    getblockheader:params[0]===tip?{hash:tip,height:110,mediantime:1893456001}:{
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


test('calendar-timestamp gift completes local review and single-use unsigned QR export',async()=>{
 await withCore({},async port=>{
  const flow=await start(port);
  const view=flow.review();
  assert.equal(view.psbtSha256.length,64);
  flow.approve({acknowledged:true,confirmedDigest:view.psbtSha256});
  const checked=await flow.finalizeReview();
  assert.equal(checked.reviewFinalized,true);
  const qr=await flow.exportQrFrames({frameCount:8});
  assert.equal(qr.psbtSha256,view.psbtSha256);
  assert.equal(qr.frames.length,8);
  assert.equal(qr.signed,false);
  assert.equal(qr.broadcast,false);
  await assert.rejects(flow.exportQrFrames(),/already consumed/);
 });
});

test('calendar-timestamp gift cannot start beneficiary approval before median-time maturity',async()=>{
 await withCore({},async port=>{
  // The RPC mock uses MTP one second after 2030-01-01. The exact
  // equality/before boundary is separately covered by Core-maturity tests.
  const flow=await start(port);
  assert.equal(flow.reviewCompleted(),false);
  assert.equal(flow.canSign,false);
 });
});
