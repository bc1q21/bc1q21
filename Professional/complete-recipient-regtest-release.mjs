// Offline signed Jade return -> exact approved regtest release -> Core mempool validation.
// Never broadcasts. No seed/private keys; all inputs are local files.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import { finalizeVerifiedProfessionalRelease } from './finalize-verified-release.mjs';
import { verifyGiftReleaseBinding } from './browser-integration/verify-gift-release-binding.mjs';

export function validateProfessionalRecipientSignedReturn({gift,evidence,signedReturn}) {
 assert.equal(signedReturn?.format,'bc1q21-professional-verified-jade-return-v1');
 assert.equal(signedReturn.network,'regtest');
 assert.equal(signedReturn.broadcast,false);
 assert.equal(signedReturn.chainVerified,false);
 assert.equal(signedReturn.signatureCryptographicallyVerified,true);
 assert.equal(signedReturn.releaseNumber,evidence.releaseNumber);
 assert.equal(signedReturn.approvedUnsignedSha256,evidence.expectedApprovedSha256);
 const release=gift?.releases?.find(x=>x.releaseNumber===evidence.releaseNumber);
 assert.ok(release,'Selected public release missing');
 const binding=verifyGiftReleaseBinding({
  gift,release,approvedUnsignedBase64:evidence.approvedUnsignedBase64,
  expectedApprovedSha256:evidence.expectedApprovedSha256
 });
 assert.equal(binding.transactionMatchesSuppliedRelease,true);
 const finalized=finalizeVerifiedProfessionalRelease(
  evidence.approvedUnsignedBase64,signedReturn.signedPsbtBase64,
  evidence.expectedApprovedSha256);
 assert.equal(finalized.signatureCryptographicallyVerified,true);
 const tx=bitcoin.Transaction.fromHex(finalized.rawTransactionHex);
 assert.equal(Buffer.from(tx.ins[0].hash).reverse().toString('hex'),release.fundingTxid);
 assert.equal(tx.ins[0].index,release.fundingVout);
 assert.equal(tx.locktime,release.lockHeight);
 assert.equal(tx.outs[0].value,release.amountSats);
 assert.equal(tx.outs[0].script.toString('hex'),release.destinationScriptHex);
 return Object.freeze({...finalized,releaseNumber:release.releaseNumber});
}

async function runProfessionalRegtestRpc(rawTransactionHex,{
 port=Number(process.env.REGTEST_RPC_PORT||18443),
 username=process.env.REGTEST_RPC_USER||'professional',
 password=process.env.REGTEST_RPC_PASSWORD||'synthetic-only'
}={}) {
 assert.ok(Number.isSafeInteger(port)&&port>=1&&port<=65535,'Invalid RPC port');
 const rpc=(method,params=[])=>new Promise((resolve,reject)=>{
  const body=JSON.stringify({jsonrpc:'1.0',id:'professional-recipient',method,params});
  const req=http.request({hostname:'127.0.0.1',port,method:'POST',path:'/',
   headers:{authorization:'Basic '+Buffer.from(username+':'+password).toString('base64'),
    'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
   let data='';res.on('data',chunk=>{data+=chunk;if(data.length>100000)req.destroy(Error('RPC response too large'));});
   res.on('end',()=>{try{const result=JSON.parse(data);if(result.error)reject(Error(JSON.stringify(result.error)));
    else resolve(result.result)}catch(error){reject(error)}});
  });req.on('error',reject);req.end(body);
 });
 const info=await rpc('getblockchaininfo');
 assert.equal(info.chain,'regtest','Only isolated Bitcoin Core regtest accepted');
 const accepted=await rpc('testmempoolaccept',[[rawTransactionHex]]);
 assert.equal(accepted.length,1);
 assert.equal(accepted[0].allowed,true,'Core rejected release: '+JSON.stringify(accepted[0]));
 return Object.freeze({rpc,txid:accepted[0].txid});
}

export async function checkProfessionalRegtestMempool(rawTransactionHex,options={}){
 const accepted=await runProfessionalRegtestRpc(rawTransactionHex,options);
 return Object.freeze({network:'regtest',txid:accepted.txid,bitcoinCoreAccepted:true,broadcast:false});
}

// Broadcast is an explicit, separate CLI-only act against loopback Bitcoin Core
// after the exact approved transaction, Jade signature and Core policy checks pass.
export async function broadcastVerifiedProfessionalRegtestRelease(rawTransactionHex,options={}){
 const accepted=await runProfessionalRegtestRpc(rawTransactionHex,options);
 const txid=await accepted.rpc('sendrawtransaction',[rawTransactionHex]);
 assert.equal(txid,accepted.txid,'Core broadcast txid differs from approved transaction');
 return Object.freeze({network:'regtest',txid,broadcast:true,confirmed:false});
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [giftPath,evidencePath,returnPath]=process.argv.slice(2);
 assert.ok(giftPath&&evidencePath&&returnPath,
  'Usage: node Professional/complete-recipient-regtest-release.mjs <gift.json> <unsigned.json> <jade-signed-return.json>');
 const load=path=>JSON.parse(readFileSync(path,'utf8'));
 const finalized=validateProfessionalRecipientSignedReturn({
  gift:load(giftPath),evidence:load(evidencePath),signedReturn:load(returnPath)});
 const acceptance=await checkProfessionalRegtestMempool(finalized.rawTransactionHex);
 assert.equal(acceptance.txid,finalized.txid);
 const output={format:'bc1q21-professional-regtest-release-validated-v1',
  ...acceptance,releaseNumber:finalized.releaseNumber,signatureVerified:true,
  rawTransactionHex:finalized.rawTransactionHex};
 const broadcastRequested=process.argv.includes('--broadcast-regtest');
 if(broadcastRequested){
  assert.equal(process.argv.at(-1),'--broadcast-regtest','Broadcast flag must be last');
  const broadcast=await broadcastVerifiedProfessionalRegtestRelease(finalized.rawTransactionHex);
  assert.equal(broadcast.txid,finalized.txid);
  output.broadcast=true;
  output.confirmed=false;
 } else {
  output.broadcast=false;
 }
 const destination=returnPath+(broadcastRequested?'.broadcast-regtest.json':'.validated-regtest.json');
 writeFileSync(destination,JSON.stringify(output,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(broadcastRequested?'PASS: validated Jade release BROADCAST on isolated regtest.':'PASS: Jade release signature and Core regtest mempool acceptance. NOT BROADCAST.',destination);
}
