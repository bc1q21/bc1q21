// Professional isolated: confirmed disposable regtest CLTV funding and unsigned PSBT.
// Public Jade origin only. No signing, device connection, real funds or broadcast.
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import {getCapturedJadeRegtestCltvHandoff} from './regtest-jade-public-fixture.mjs';
import {prepareProfessionalReleaseFromPublicHandoff} from './public-funding-release-integration.mjs';
import {validateRegtestFundingCheckpoint} from './regtest-chain-continuity.mjs';

const port=Number(process.env.REGTEST_RPC_PORT||18443);
const auth='Basic '+Buffer.from('professional:synthetic-only').toString('base64');
async function rpc(method,params=[],wallet='') {
 const body=JSON.stringify({jsonrpc:'1.0',id:'professional-public-regtest',method,params});
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:wallet?'/wallet/'+encodeURIComponent(wallet):'/',
   method:'POST',headers:{authorization:auth,'content-type':'application/json',
    'content-length':Buffer.byteLength(body)}},res=>{
   let raw='';res.on('data',b=>raw+=b);res.on('end',()=>{
    try{const x=JSON.parse(raw);if(x.error)reject(Error(method+': '+JSON.stringify(x.error)));
     else resolve(x.result);}catch(e){reject(e);}
   });
  });req.on('error',reject);req.end(body);
 });
}
for(let i=0;i<30;i++){
 try{const info=await rpc('getblockchaininfo');assert.equal(info.chain,'regtest');break;}
 catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,1000));}
}
const start=await rpc('getblockchaininfo');
assert.equal(start.chain,'regtest');assert.equal(start.blocks,0,'Require fresh regtest chain');
const fixture=await getCapturedJadeRegtestCltvHandoff(110);
const wallet='professional-jade-public-fixture';
await rpc('createwallet',[wallet]);
const mining=await rpc('getnewaddress',[],wallet);
await rpc('generatetoaddress',[120,mining]);
const txid=await rpc('sendtoaddress',[fixture.publicHandoff.fundingAddress,0.001],wallet);
await rpc('generatetoaddress',[1,mining]);
const chain=await rpc('getblockchaininfo');
assert.equal(chain.chain,'regtest');assert.equal(chain.blocks,121);
const blockhash=chain.bestblockhash;
const block=await rpc('getblock',[blockhash,1]);
assert.ok(block.tx.includes(txid));
const decoded=await rpc('getrawtransaction',[txid,true,blockhash]);
const matches=decoded.vout.filter(o=>o.scriptPubKey.hex===fixture.fundingScriptPubKeyHex&&
 Math.round(o.value*1e8)===100000);
assert.equal(matches.length,1,'Expected one matching funded CLTV output');
const vout=matches[0].n;
const utxo=await rpc('gettxout',[txid,vout]);
assert.ok(utxo&&utxo.confirmations>=1);
assert.equal(utxo.scriptPubKey.hex,fixture.fundingScriptPubKeyHex);
assert.equal(Math.round(utxo.value*1e8),100000);
const original=bitcoin.Transaction.fromHex(await rpc('getrawtransaction',[txid,false,blockhash]));
const fundingTxHex=original.__toBuffer(undefined,undefined,false).toString('hex');
assert.equal(bitcoin.Transaction.fromHex(fundingTxHex).getId(),txid);
const destPub=Buffer.from('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798','hex');
const destination=bitcoin.payments.p2wpkh({pubkey:destPub,network:bitcoin.networks.regtest});
const prepared=prepareProfessionalReleaseFromPublicHandoff(fixture.publicHandoff,{
 fundingTxHex,vout,expectedTxid:txid,expectedSats:100000,
 masterFingerprintHex:fixture.masterFingerprintHex,derivationPath:fixture.derivationPath,
 destinationScriptHex:destination.output.toString('hex'),destinationSats:99000
});
const psbt=bitcoin.Psbt.fromBase64(prepared.unsignedPsbtBase64);
assert.equal(psbt.txInputs.length,1);assert.equal(psbt.txOutputs.length,1);
assert.equal(Buffer.from(psbt.txInputs[0].hash).reverse().toString('hex'),txid);
assert.equal(psbt.txInputs[0].index,vout);
assert.equal(psbt.locktime,110);assert.equal(psbt.txOutputs[0].value,99000);
assert.equal(Buffer.from(psbt.txOutputs[0].script).toString('hex'),destination.output.toString('hex'));
assert.equal(psbt.data.inputs[0].nonWitnessUtxo.toString('hex'),fundingTxHex);
assert.equal(psbt.data.inputs[0].redeemScript.toString('hex'),fixture.publicHandoff.redeemScriptHex);
assert.equal(psbt.data.inputs[0].bip32Derivation.length,1);
assert.equal(psbt.data.inputs[0].bip32Derivation[0].pubkey.toString('hex'),fixture.publicHandoff.signerPubkeyHex);
assert.equal(psbt.data.inputs[0].bip32Derivation[0].masterFingerprint.toString('hex'),fixture.masterFingerprintHex);
assert.equal(prepared.signed,false);assert.equal(prepared.broadcast,false);
const checkpoint=validateRegtestFundingCheckpoint({version:1,chain:'regtest',
 fundingTxid:txid,vout,amountSats:100000,scriptPubKeyHex:fixture.fundingScriptPubKeyHex,
 fundingBlockHash:blockhash,fundingBlockHeight:chain.blocks});
const sha=createHash('sha256').update(psbt.toBuffer()).digest('hex');
console.log(JSON.stringify({result:'PASS_STAGE_A',chain:'regtest',height:chain.blocks,
 checkpoint,unsignedPsbtSha256:sha,inputSats:100000,outputSats:99000,feeSats:1000,
 signerSource:fixture.signerSource,signed:false,broadcast:false}));
console.log('PASS: confirmed real regtest CLTV funding output and Jade-public-origin unsigned PSBT');
