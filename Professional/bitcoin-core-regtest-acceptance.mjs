// Isolated Bitcoin Core regtest mempool-policy and script acceptance test.
// Uses disposable regtest-only key and coins. No mainnet access, no broadcast.
import assert from 'node:assert/strict';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { Buffer } from 'node:buffer';
const port=Number(process.env.REGTEST_RPC_PORT||18443);
const auth='Basic '+Buffer.from('professional:synthetic-only').toString('base64');
async function rpc(method,params=[],wallet='') {
 const body=JSON.stringify({jsonrpc:'1.0',id:'regtest',method,params});
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:wallet?'/wallet/'+encodeURIComponent(wallet):'/',method:'POST',
   headers:{authorization:auth,'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
   let out='';res.on('data',b=>out+=b);res.on('end',()=>{
    try {const j=JSON.parse(out);if(j.error)reject(Error(method+': '+JSON.stringify(j.error)));else resolve(j.result)}
    catch(e){reject(e)}
   });
  });req.on('error',reject);req.end(body);
 });
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<30;i++){try{await rpc('getblockchaininfo');break}catch(e){if(i===29)throw e;await sleep(1000)}}
assert.equal((await rpc('getblockchaininfo')).chain,'regtest');
const wallet='professional-regtest-fixture';
await rpc('createwallet',[wallet]);
const mine=await rpc('getnewaddress',[] ,wallet);
await rpc('generatetoaddress',[120,mine]);
const key=Buffer.alloc(32);key[31]=7; // deliberately public fixture-only key, never fund outside regtest
const pub=Buffer.from(secp256k1.getPublicKey(key,true));
const redeem=Buffer.concat([Buffer.from([1,110,0xb1,0x75,33]),pub,Buffer.from([0xac])]);
const p2sh=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const fundingId=await rpc('sendtoaddress',[p2sh.address,0.001],wallet);
await rpc('generatetoaddress',[1,mine]);
const fundingHex=(await rpc('gettransaction',[fundingId],wallet)).hex;
const funding=bitcoin.Transaction.fromHex(fundingHex);
const vout=funding.outs.findIndex(o=>Buffer.from(o.script).equals(Buffer.from(p2sh.output)));
assert.ok(vout>=0,'funding P2SH output must exist');
const dest=bitcoin.payments.p2wpkh({pubkey:Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),8]),true)),network:bitcoin.networks.regtest});
const make=(opts={})=>{
 const tx=new bitcoin.Transaction();tx.version=2;tx.locktime=opts.locktime??110;
 tx.addInput(funding.getHash(),vout,opts.sequence??0xfffffffe);
 tx.addOutput(dest.output,(funding.outs[vout].value-(opts.fee??1000)));
 const script=opts.redeem??redeem;
 const digest=tx.hashForSignature(0,script,bitcoin.Transaction.SIGHASH_ALL);
 const compact=Buffer.from(secp256k1.sign(digest,key).toCompactRawBytes());
 const sig=Buffer.from(bitcoin.script.signature.encode(compact,bitcoin.Transaction.SIGHASH_ALL));
 if(opts.badSig) sig[10]^=1;
 tx.ins[0].script=bitcoin.script.compile([sig,script]);
 if(opts.mutateOutput) tx.outs[0].value--;
 return tx.toHex();
};
async function check(label,hex,allowed){
 const response=await rpc('testmempoolaccept',[[hex]]);
 assert.equal(response.length,1);
 assert.equal(response[0].allowed,allowed,label+': '+JSON.stringify(response[0]));
 console.log(JSON.stringify({test:label,allowed:response[0].allowed,reason:response[0]['reject-reason']??null}));
}
await check('valid P2SH CLTV spend',make(),true);
await check('locktime below CLTV threshold',make({locktime:109}),false);
await check('final sequence fails CLTV',make({sequence:0xffffffff}),false);
await check('bad signature',make({badSig:true}),false);
await check('modified signed output',make({mutateOutput:true}),false);
await check('wrong redeemScript',make({redeem:Buffer.concat([Buffer.from([1,111,0xb1,0x75,33]),pub,Buffer.from([0xac])])}),false);
console.log('PASS: Bitcoin Core regtest mempool policy and P2SH/CLTV script acceptance; no transaction broadcast');
