// Professional isolated: independently validate a PUBLIC unsigned PSBT against a
// restarted, snapshot-restored disposable Bitcoin Core 28 regtest chain.
// NO private material, signer, wallet loading, public broadcast, or hardware.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import {assertSameRegtestFunding} from './regtest-chain-continuity.mjs';
import {getCapturedJadeRegtestCltvHandoff} from './regtest-jade-public-fixture.mjs';

const path=process.env.PROFESSIONAL_PUBLIC_EVIDENCE_PATH;
if(!path||!path.startsWith('/'))throw Error('Explicit absolute public-only evidence path required');
const evidence=JSON.parse(readFileSync(path,'utf8'));
const keys=['format','network','checkpoint','expectedChainTip','expectedChainHeight',
 'unsignedPsbtBase64','unsignedPsbtSha256','fundingTxHex','redeemScriptHex',
 'signerPubkeyHex','destinationScriptHex','inputSats','outputSats','feeSats',
 'locktime','signed','broadcast'];
assert.deepEqual(Object.keys(evidence).sort(),keys.sort(),'Public-only evidence schema mismatch');
assert.equal(evidence.format,'bc1q21-professional-regtest-public-psbt-v1');
assert.equal(evidence.network,'regtest');
assert.equal(evidence.signed,false);assert.equal(evidence.broadcast,false);
const auth='Basic '+Buffer.from('professional:synthetic-only').toString('base64');
async function rpc(method,params=[]){
 const body=JSON.stringify({jsonrpc:'1.0',id:'professional-stage-b',method,params});
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port:18443,path:'/',method:'POST',
   headers:{authorization:auth,'content-type':'application/json',
    'content-length':Buffer.byteLength(body)}},res=>{
   let raw='';res.on('data',b=>raw+=b);res.on('end',()=>{
    try {const x=JSON.parse(raw);if(x.error)reject(Error(method+': '+JSON.stringify(x.error)));
     else resolve(x.result);}catch(e){reject(e);}
   });
  });req.on('error',reject);req.end(body);
 });
}
for(let i=0;i<30;i++){
 try{const c=await rpc('getblockchaininfo');assert.equal(c.chain,'regtest');break;}
 catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,1000));}
}
const chain=await rpc('getblockchaininfo');
assert.equal(chain.chain,'regtest');
assert.equal(chain.blocks,evidence.expectedChainHeight);
assert.equal(chain.bestblockhash,evidence.expectedChainTip);
const c=evidence.checkpoint;
assert.equal(c.fundingBlockHash,chain.bestblockhash);
assert.equal(c.fundingBlockHeight,chain.blocks);
const block=await rpc('getblock',[c.fundingBlockHash,1]);
assert.ok(block.tx.includes(c.fundingTxid),'Funding transaction missing from restored funding block');
const funding=await rpc('getrawtransaction',[c.fundingTxid,true,c.fundingBlockHash]);
const vout=funding.vout.find(x=>x.n===c.vout);
assert.ok(vout,'Funded outpoint missing from confirmed transaction');
assert.equal(vout.scriptPubKey.hex,c.scriptPubKeyHex);
assert.equal(Math.round(vout.value*1e8),c.amountSats);
const utxo=await rpc('gettxout',[c.fundingTxid,c.vout]);
assert.ok(utxo,'Original confirmed output is spent or missing');
assertSameRegtestFunding(c,{chain:chain.chain,fundingTxid:c.fundingTxid,vout:c.vout,
 amountSats:Math.round(utxo.value*1e8),scriptPubKeyHex:utxo.scriptPubKey.hex,
 fundingBlockHash:c.fundingBlockHash,fundingBlockHeight:c.fundingBlockHeight,
 confirmations:utxo.confirmations,unspent:true});
const fixture=await getCapturedJadeRegtestCltvHandoff(evidence.locktime);
assert.equal(evidence.signerPubkeyHex,fixture.publicHandoff.signerPubkeyHex);
assert.equal(evidence.redeemScriptHex,fixture.publicHandoff.redeemScriptHex);
assert.equal(c.scriptPubKeyHex,fixture.fundingScriptPubKeyHex);
const p=bitcoin.Psbt.fromBase64(evidence.unsignedPsbtBase64);
assert.equal(createHash('sha256').update(p.toBuffer()).digest('hex'),evidence.unsignedPsbtSha256);
assert.equal(p.txInputs.length,1);assert.equal(p.txOutputs.length,1);
assert.equal(Buffer.from(p.txInputs[0].hash).reverse().toString('hex'),c.fundingTxid);
assert.equal(p.txInputs[0].index,c.vout);
assert.equal(p.locktime,evidence.locktime);
assert.equal(p.txOutputs[0].value,evidence.outputSats);
assert.equal(Buffer.from(p.txOutputs[0].script).toString('hex'),evidence.destinationScriptHex);
assert.equal(evidence.inputSats,100000);assert.equal(evidence.outputSats,99000);
assert.equal(evidence.feeSats,evidence.inputSats-evidence.outputSats);
assert.equal(p.data.inputs[0].redeemScript.toString('hex'),evidence.redeemScriptHex);
assert.equal(p.data.inputs[0].nonWitnessUtxo.toString('hex'),evidence.fundingTxHex);
const previous=bitcoin.Transaction.fromHex(evidence.fundingTxHex);
assert.equal(previous.getId(),c.fundingTxid);
assert.equal(previous.outs[c.vout].value,c.amountSats);
assert.equal(Buffer.from(previous.outs[c.vout].script).toString('hex'),c.scriptPubKeyHex);
assert.equal(p.data.inputs[0].bip32Derivation.length,1);
const origin=p.data.inputs[0].bip32Derivation[0];
assert.equal(origin.pubkey.toString('hex'),fixture.publicHandoff.signerPubkeyHex);
assert.equal(origin.masterFingerprint.toString('hex'),fixture.masterFingerprintHex);
console.log('PASS_STAGE_B: restored Bitcoin Core 28 regtest verified identical CLTV funding outpoint and unsigned Jade-public-origin PSBT');
console.log(JSON.stringify({result:'PASS_STAGE_B',chain:'regtest',height:chain.blocks,
 fundingTxid:c.fundingTxid,vout:c.vout,amountSats:c.amountSats,
 unsignedPsbtSha256:evidence.unsignedPsbtSha256,signed:false,broadcast:false}));
