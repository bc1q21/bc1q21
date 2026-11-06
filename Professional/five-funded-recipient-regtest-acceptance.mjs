// Five genuinely funded, distinct CLTV outputs in one disposable Bitcoin Core
// regtest transaction. Exports public gift + five separate unsigned Jade PSBTs.
// No private key, hardware signature, mainnet, or spend broadcast.
import assert from 'node:assert/strict';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {mkdirSync,writeFileSync} from 'node:fs';
import {prepareRecipientReleaseEvidence} from './professional-recipient-release-bridge.mjs';
import {selectPublicGiftRelease} from './browser-integration/select-public-gift-release.mjs';
const port=Number(process.env.REGTEST_RPC_PORT||18443);
const auth='Basic '+Buffer.from('professional:synthetic-only').toString('base64');
async function rpc(method,params=[],wallet=''){
 const body=JSON.stringify({jsonrpc:'1.0',id:'five-funded',method,params});
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:wallet?'/wallet/'+encodeURIComponent(wallet):'/',
   method:'POST',headers:{authorization:auth,'content-type':'application/json',
   'content-length':Buffer.byteLength(body)}},res=>{
   let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>{
    try{const response=JSON.parse(data);if(response.error)reject(Error(method+': '+JSON.stringify(response.error)));
    else resolve(response.result)}catch(error){reject(error)}
   });
  });req.on('error',reject);req.end(body);
 });
}
for(let n=0;n<30;n++){try{await rpc('getblockchaininfo');break}catch(error){
 if(n===29)throw error;await new Promise(resolve=>setTimeout(resolve,1000));
}}
assert.equal((await rpc('getblockchaininfo')).chain,'regtest');
const wallet='professional-five-release-disposable';
await rpc('createwallet',[wallet]);
const miner=await rpc('getnewaddress',[],wallet);
await rpc('generatetoaddress',[120,miner]);
const destinationKey=Buffer.alloc(32);destinationKey[31]=70;
const destination=bitcoin.payments.p2wpkh({pubkey:Buffer.from(secp256k1.getPublicKey(destinationKey,true)),
 network:bitcoin.networks.regtest});
const outputs=[];
for(let i=0;i<5;i++){
 const privateKey=Buffer.alloc(32);privateKey[31]=i+20;
 const pubkey=Buffer.from(secp256k1.getPublicKey(privateKey,true));
 const locktime=110+i;
 const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
  bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pubkey,bitcoin.opcodes.OP_CHECKSIG]);
 const p2sh=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
 outputs.push({pubkey,locktime,redeem,p2sh,sats:(i+1)*20000});
}
const addresses=Object.fromEntries(outputs.map(o=>[o.p2sh.address,o.sats/1e8]));
const txid=await rpc('sendmany',['',addresses],wallet);
await rpc('generatetoaddress',[1,miner]);
const funded=bitcoin.Transaction.fromHex((await rpc('gettransaction',[txid],wallet)).hex);
const fundingTxHex=funded.__toBuffer(undefined,undefined,false).toString('hex');
assert.equal(bitcoin.Transaction.fromHex(fundingTxHex).getId(),txid);
const gift={fundingAddress:outputs[0].p2sh.address,releases:[]};
const evidences=[];
for(let i=0;i<5;i++){
 const output=outputs[i];
 const vout=funded.outs.findIndex(o=>Buffer.from(o.script).equals(output.p2sh.output));
 assert.ok(vout>=0,'Missing real funded output');
 const inputSats=funded.outs[vout].value;
 assert.equal(inputSats,output.sats);
 const handoff={version:1,network:'regtest',signerPubkeyHex:output.pubkey.toString('hex'),
  locktime:output.locktime,redeemScriptHex:output.redeem.toString('hex'),
  fundingAddress:output.p2sh.address};
 const funding={fundingTxHex,vout,expectedTxid:txid,expectedSats:inputSats,
  masterFingerprintHex:'00000014',derivationPath:[0x80000054,0x80000000,0x80000000,1,i],
  destinationScriptHex:destination.output.toString('hex'),destinationSats:inputSats-1000};
 const evidence=prepareRecipientReleaseEvidence({publicHandoff:handoff,funding,releaseNumber:i+1});
 gift.releases.push(evidence.publicRelease);
 evidences.push({releaseNumber:i+1,approvedUnsignedBase64:evidence.approvedUnsignedBase64,
  expectedApprovedSha256:evidence.expectedApprovedSha256});
}
assert.equal(new Set(gift.releases.map(r=>r.fundingTxid+':'+r.fundingVout)).size,5);
for(let i=1;i<=5;i++){
 const selected=selectPublicGiftRelease({gift,recipientLocator:gift.fundingAddress,releaseNumber:i});
 assert.equal(selected.fundingTxid,txid);
 assert.equal(selected.inputSats,i*20000);
}
mkdirSync('Professional/artifacts',{recursive:true});
writeFileSync('Professional/artifacts/five-funded-recipient-gift-regtest.json',JSON.stringify(gift,null,2)+'\n');
writeFileSync('Professional/artifacts/five-funded-recipient-psbts-regtest.json',JSON.stringify(evidences,null,2)+'\n');
console.log('PASS: five independently funded CLTV releases and five unsigned PSBTs match Bitcoin Core regtest.');
