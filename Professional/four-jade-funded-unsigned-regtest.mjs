// bc1q21 Professional — four distinct Jade-public-key funded regtest release PSBTs.
// RUN ONLY against an isolated disposable Bitcoin Core regtest RPC on 127.0.0.1.
// Public information only. No hardware, seeds, signing, or public-network broadcast.
// Writes a portable public transaction record; snapshot chain separately BEFORE stopping Core.
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import bitcoin from 'bitcoinjs-lib';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {prepareProfessionalReleaseFromPublicHandoff} from './public-funding-release-integration.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const fingerprint='e29ac13c';
const heights=[130,140,150,160], amounts=[12000,15000,18000,21000];
const sha=b=>createHash('sha256').update(b).digest('hex');
const auth='Basic '+Buffer.from('professional:synthetic-only').toString('base64');
const port=Number(process.env.REGTEST_RPC_PORT||18443);
async function rpc(method,params=[],wallet=''){
 const body=JSON.stringify({jsonrpc:'1.0',id:'four-jade-public-only',method,params});
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:wallet?'/wallet/'+encodeURIComponent(wallet):'/',
   method:'POST',headers:{authorization:auth,'content-type':'application/json',
   'content-length':Buffer.byteLength(body)}},res=>{
   let s='';res.on('data',b=>s+=b);res.on('end',()=>{
    try{const o=JSON.parse(s);if(o.error)reject(Error(method+': '+JSON.stringify(o.error)));
     else resolve(o.result);}catch(e){reject(e);}
   });
  });req.on('error',reject);req.end(body);
 });
}
const start=await rpc('getblockchaininfo');
assert.equal(start.chain,'regtest');
assert.equal(start.blocks,0,'Require a NEW disposable regtest at genesis; never touch existing node');
const outputPath=process.env.PROFESSIONAL_FOUR_PUBLIC_EVIDENCE_PATH;
assert.ok(outputPath?.startsWith('/'),'Explicit absolute public-only evidence file path required');
const wallet='professional-four-jade-public-only';
await rpc('createwallet',[wallet]);
const mining=await rpc('getnewaddress',[],wallet);
await rpc('generatetoaddress',[120,mining]);
const handoffs=heights.map((locktime,i)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex:fingerprint,childIndex:i,locktime
}));
assert.equal(new Set(handoffs.map(h=>h.fundingScriptPubKeyHex)).size,4);
const destination=bitcoin.payments.p2wpkh({
 pubkey:Buffer.from('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798','hex'),
 network:bitcoin.networks.regtest
});
const funded=[];
for(let i=0;i<4;i++){
 const txid=await rpc('sendtoaddress',[handoffs[i].fundingAddress,amounts[i]/1e8],wallet);
 const raw=await rpc('getrawtransaction',[txid,false]);
 const tx=bitcoin.Transaction.fromHex(raw);
 const vouts=tx.outs.map((o,vout)=>({o,vout})).filter(({o})=>
  o.value===amounts[i]&&Buffer.from(o.script).toString('hex')===handoffs[i].fundingScriptPubKeyHex);
 assert.equal(vouts.length,1,'Ambiguous funding output');
 funded.push({txid,vout:vouts[0].vout,fundingTxHex:raw});
}
await rpc('generatetoaddress',[1,mining]);
const chain=await rpc('getblockchaininfo');
assert.equal(chain.blocks,121);
const block=await rpc('getblock',[chain.bestblockhash,1]);
const releases=[];
for(let i=0;i<4;i++){
 const f=funded[i],h=handoffs[i];
 assert.ok(block.tx.includes(f.txid),'Funding not in confirmed block');
 const utxo=await rpc('gettxout',[f.txid,f.vout]);
 assert.ok(utxo&&utxo.confirmations>=1,'Funding outpoint unconfirmed or spent');
 assert.equal(utxo.scriptPubKey.hex,h.fundingScriptPubKeyHex);
 assert.equal(Math.round(utxo.value*1e8),amounts[i]);
 const prepared=prepareProfessionalReleaseFromPublicHandoff(h,{
  fundingTxHex:f.fundingTxHex,vout:f.vout,expectedTxid:f.txid,expectedSats:amounts[i],
  masterFingerprintHex:fingerprint,derivationPath:h.derivationPath,
  destinationScriptHex:destination.output.toString('hex'),destinationSats:amounts[i]-1000
 });
 const psbt=bitcoin.Psbt.fromBase64(prepared.unsignedPsbtBase64);
 assert.equal(psbt.txInputs.length,1);assert.equal(psbt.txOutputs.length,1);
 assert.equal(psbt.locktime,heights[i]);assert.equal(psbt.txInputs[0].sequence,0xfffffffe);
 assert.equal(Buffer.from(psbt.txInputs[0].hash).reverse().toString('hex'),f.txid);
 assert.equal(psbt.txInputs[0].index,f.vout);
 assert.equal(psbt.txOutputs[0].value,amounts[i]-1000);
 assert.equal(Buffer.from(psbt.data.inputs[0].redeemScript).toString('hex'),h.redeemScriptHex);
 const origins=psbt.data.inputs[0].bip32Derivation;
 assert.equal(origins.length,1);
 assert.equal(Buffer.from(origins[0].pubkey).toString('hex'),h.signerPubkeyHex);
 assert.equal(Buffer.from(origins[0].masterFingerprint).toString('hex'),fingerprint);
 assert.equal(origins[0].path,`m/84'/0'/0'/1/${i}`);
 assert.equal(psbt.data.inputs[0].partialSig,undefined);
 releases.push({release:i+1,childIndex:i,derivationPath:origins[0].path,
  locktime:heights[i],fundingTxid:f.txid,vout:f.vout,fundingTxHex:f.fundingTxHex,
  inputSats:amounts[i],destinationSats:amounts[i]-1000,feeSats:1000,
  signerPubkeyHex:h.signerPubkeyHex,redeemScriptHex:h.redeemScriptHex,
  fundingScriptPubKeyHex:h.fundingScriptPubKeyHex,fundingAddress:h.fundingAddress,
  destinationScriptHex:destination.output.toString('hex'),
  unsignedPsbtBase64:prepared.unsignedPsbtBase64,unsignedPsbtSha256:sha(psbt.toBuffer()),
  signed:false});
}
assert.equal(new Set(releases.map(r=>r.fundingTxid+':'+r.vout)).size,4);
const record={format:'bc1q21-professional-four-jade-public-regtest-v1',
 network:'regtest',chainHeight:chain.blocks,chainTip:chain.bestblockhash,
 fingerprint,accountPath:"m/84'/0'/0'",releases,
 signed:false,hardwareScanned:false,publicBitcoinBroadcast:false,
 IMPORTANT:'Preserve the identical disposable Bitcoin Core chainstate/blocks with the existing allowlisted offline snapshot process before ending the job; this JSON alone cannot prove UTXO persistence.'};
writeFileSync(outputPath,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('PASS_FOUR_JADE_PUBLIC_FUNDED_UNSIGNED_REGTEST',JSON.stringify({
 chain:'regtest',height:chain.blocks,tip:chain.bestblockhash,
 outpoints:releases.map(r=>({release:r.release,txid:r.fundingTxid,vout:r.vout,psbtSha256:r.unsignedPsbtSha256})),
 signed:false,hardwareScanned:false,publicNetworkBroadcast:false}));
