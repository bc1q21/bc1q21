// Isolated four-stage CLTV spend proof with disposable SOFTWARE fixture keys.
// This deliberately does NOT claim signatures from Jade's public xpub.
// Regtest RPC only, local mining and broadcasting only; no real Bitcoin.
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
const heights=[130,140,150,160], amounts=[12000,15000,18000,21000];
const keys=heights.map((_,i)=>createHash('sha256').update('bc1q21-professional-disposable-four-cltv-'+i).digest());
const pubkeys=keys.map(k=>Buffer.from(secp256k1.getPublicKey(k,true)));
const scripts=heights.map((h,i)=>bitcoin.script.compile([bitcoin.script.number.encode(h),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pubkeys[i],bitcoin.opcodes.OP_CHECKSIG]));
const payments=scripts.map(s=>bitcoin.payments.p2sh({redeem:{output:s},network:bitcoin.networks.regtest}));
const auth='Basic '+Buffer.from('professional:synthetic-only').toString('base64');
async function rpc(method,params=[],wallet=''){const body=JSON.stringify({jsonrpc:'1.0',id:'professional-four-release',method,params});return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:18443,path:wallet?'/wallet/'+encodeURIComponent(wallet):'/',method:'POST',headers:{authorization:auth,'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>{try{const x=JSON.parse(s);if(x.error)reject(Error(method+': '+JSON.stringify(x.error)));else resolve(x.result)}catch(e){reject(e)}})});req.on('error',reject);req.end(body)})}
assert.equal((await rpc('getblockchaininfo')).chain,'regtest');
assert.equal((await rpc('getblockchaininfo')).blocks,121);
const wallet='professional-four-software-releases';
await rpc('createwallet',[wallet]);
const mining=await rpc('getnewaddress',[],wallet);
await rpc('generatetoaddress',[101,mining]);
const funding=[];
for(let i=0;i<4;i++){
 const txid=await rpc('sendtoaddress',[payments[i].address,amounts[i]/1e8],wallet);
 const raw=await rpc('getrawtransaction',[txid]);
 const tx=bitcoin.Transaction.fromHex(raw);
 const vout=tx.outs.findIndex(o=>o.value===amounts[i]&&Buffer.from(o.script).equals(Buffer.from(payments[i].output)));
 assert.ok(vout>=0,'Funding script not found');
 funding.push({txid,vout,raw});
}
await rpc('generatetoaddress',[1,mining]);
const destination=bitcoin.address.toOutputScript(await rpc('getnewaddress',[],wallet),bitcoin.networks.regtest);
function signedSpend(i,locktime=heights[i],sequence=0xfffffffe){
 const f=funding[i],t=new bitcoin.Transaction();t.version=2;t.locktime=locktime;
 t.addInput(Buffer.from(f.txid,'hex').reverse(),f.vout,sequence);
 t.addOutput(destination,amounts[i]-1000);
 const hash=t.hashForSignature(0,scripts[i],bitcoin.Transaction.SIGHASH_ALL);
 const compact=Buffer.from(secp256k1.sign(hash,keys[i],{lowS:true,prehash:false}).toCompactRawBytes());
 const sig=bitcoin.script.signature.encode(compact,bitcoin.Transaction.SIGHASH_ALL);
 t.ins[0].script=bitcoin.script.compile([sig,scripts[i]]);
 return t;
}
const results=[];
for(let i=0;i<4;i++){
 const h=heights[i];
 // At chain height h-2, next-block height h-1 is before CLTV height h.
 const current=(await rpc('getblockchaininfo')).blocks;
 assert.ok(current<=h-2,'Pre-locktime boundary already passed');
 await rpc('generatetoaddress',[h-2-current,mining]);
 const premature=signedSpend(i);
 const denied=await rpc('testmempoolaccept',[[premature.toHex()]]);
 assert.equal(denied.length,1);assert.equal(denied[0].allowed,false,'Premature signed CLTV spend accepted');
 const wrongSequence=signedSpend(i,h,0xffffffff);
 const sequenceDenied=await rpc('testmempoolaccept',[[wrongSequence.toHex()]]);
 assert.equal(sequenceDenied[0].allowed,false,'Final-sequence CLTV spend accepted');
 const wrongTime=signedSpend(i,h-1);
 const timeDenied=await rpc('testmempoolaccept',[[wrongTime.toHex()]]);
 assert.equal(timeDenied[0].allowed,false,'Wrong-locktime CLTV spend accepted');
 assert.ok(await rpc('gettxout',[funding[i].txid,funding[i].vout]),'Prematurely spent');
 await rpc('generatetoaddress',[1,mining]); // height h-1, next block h
 const valid=await rpc('testmempoolaccept',[[premature.toHex()]]);
 assert.equal(valid[0].allowed,true,'Mature signed spend rejected: '+JSON.stringify(valid[0]));
 const broadcastTxid=await rpc('sendrawtransaction',[premature.toHex()]);
 assert.equal(broadcastTxid,premature.getId());
 await rpc('generatetoaddress',[1,mining]);
 const receipt=await rpc('getrawtransaction',[broadcastTxid,true]);
 assert.ok(receipt.confirmations>=1,'Release not confirmed');
 assert.equal(await rpc('gettxout',[funding[i].txid,funding[i].vout]),null,'Released outpoint remains unspent');
 for(let j=i+1;j<4;j++)assert.ok(await rpc('gettxout',[funding[j].txid,funding[j].vout]),'Later release was affected');
 results.push({release:i+1,lockHeight:h,amountSats:amounts[i],txid:broadcastTxid,confirmed:true,preLockRejected:true,finalSequenceRejected:true,wrongLocktimeRejected:true});
}
console.log('PASS_FOUR_STAGED_SOFTWARE_CLTV_REGTEST_RELEASES',JSON.stringify({chain:'regtest',results,independentConfirmedReleases:4,hardwareSigned:false,signer:'disposable software keys unrelated to Jade',regtestBroadcast:true,publicNetworkBroadcast:false,realFunds:false}));
