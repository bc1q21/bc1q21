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

export async function checkProfessionalRegtestMempool(rawTransactionHex,{
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
 return Object.freeze({network:'regtest',txid:accepted[0].txid,
  bitcoinCoreAccepted:true,broadcast:false});
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
 const destination=returnPath+'.validated-regtest.json';
 writeFileSync(destination,JSON.stringify(output,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('PASS: Jade release signature and Core regtest mempool acceptance. NOT BROADCAST.',destination);
}
