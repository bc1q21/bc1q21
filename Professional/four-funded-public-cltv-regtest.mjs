// Isolated Professional four-output regtest funding proof. Public xpub only.
// No hardware, private keys, real funds or broadcast outside local disposable regtest.
import assert from 'node:assert/strict';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
const xpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const heights=[130,140,150,160],amounts=[12000,15000,18000,21000];
const auth='Basic '+Buffer.from('professional:synthetic-only').toString('base64');
async function rpc(method,params=[],wallet=''){const body=JSON.stringify({jsonrpc:'1.0',id:'professional-four-funded',method,params});return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:18443,path:wallet?'/wallet/'+encodeURIComponent(wallet):'/',method:'POST',headers:{authorization:auth,'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>{try{const x=JSON.parse(s);if(x.error)reject(Error(method+': '+JSON.stringify(x.error)));else resolve(x.result)}catch(e){reject(e)}})});req.on('error',reject);req.end(body)})}
const info=await rpc('getblockchaininfo');assert.equal(info.chain,'regtest');assert.equal(info.blocks,121);
const wallet='professional-four-output-ephemeral';
await rpc('createwallet',[wallet]);
const mining=await rpc('getnewaddress',[] ,wallet);
await rpc('generatetoaddress',[101,mining]);
const handoffs=heights.map((locktime,i)=>deriveJadePublicCltvHandoff({accountXpub:xpub,masterFingerprintHex:'e29ac13c',childIndex:i,locktime}));
assert.equal(new Set(handoffs.map(h=>h.fundingScriptPubKeyHex)).size,4);
const outpoints=[];
for(let i=0;i<4;i++){
 const txid=await rpc('sendtoaddress',[handoffs[i].fundingAddress,amounts[i]/1e8],wallet);
 const tx=await rpc('getrawtransaction',[txid,true]);
 const vout=tx.vout.find(v=>v.scriptPubKey.hex===handoffs[i].fundingScriptPubKeyHex&&Math.round(v.value*1e8)===amounts[i]);
 assert.ok(vout,'Matching P2SH output not found');
 outpoints.push({txid,vout:vout.n,locktime:heights[i],amountSats:amounts[i],script:handoffs[i].fundingScriptPubKeyHex});
}
await rpc('generatetoaddress',[1,mining]);
for(const o of outpoints){const utxo=await rpc('gettxout',[o.txid,o.vout]);assert.ok(utxo&&utxo.confirmations>=1);assert.equal(utxo.scriptPubKey.hex,o.script);assert.equal(Math.round(utxo.value*1e8),o.amountSats)}
// Negative spend: a pre-locktime transaction with an intentionally invalid empty
// unlocking script must be rejected. This does not isolate the CLTV failure reason.
const original=outpoints[3];const t=new bitcoin.Transaction();t.version=2;t.locktime=159;
t.addInput(Buffer.from(original.txid,'hex').reverse(),original.vout,0xfffffffe);
t.addOutput(Buffer.from(handoffs[3].fundingScriptPubKeyHex,'hex'),original.amountSats-1000);
const denied=await rpc('testmempoolaccept',[[t.toHex()]]);
assert.equal(denied.length,1);assert.equal(denied[0].allowed,false,'Unsigned invalid release unexpectedly accepted');
for(const o of outpoints)assert.ok(await rpc('gettxout',[o.txid,o.vout]),'Funding outpoint unexpectedly spent');
console.log('PASS_FOUR_FUNDED_PUBLIC_P2SH_CLTV_REGTEST',JSON.stringify({chain:'regtest',height:(await rpc('getblockchaininfo')).blocks,outputs:outpoints.map(({locktime,amountSats,txid,vout})=>({locktime,amountSats,txid,vout})),uniqueScripts:4,confirmedOutputs:4,negativeUnsignedSpendRejected:true,negativeTestDoesNotProveCltvEnforcement:true,hardwareSigned:false,broadcastToPublicNetwork:false,regtestFundingTransactions:true,realFunds:false}));
