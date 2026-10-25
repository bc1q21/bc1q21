// Offline Jade return acceptance for the exact funded calendar gift.
// Regtest only. Never broadcasts or handles private keys/recovery words.
// Usage: node Professional/verify-calendar-jade-return.mjs <handoff.json> <signed-qr-frames.txt>
// Requires a local, separately restored regtest Bitcoin Core RPC endpoint.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import {URDecoder} from '@ngraveio/bc-ur';
import cbor from 'cbor';
import {finalizeVerifiedProfessionalRelease} from './finalize-verified-release.mjs';

const [handoffPath,framesPath]=process.argv.slice(2);
assert.ok(handoffPath&&framesPath,'Public handoff and returned Jade frames are required');
const handoff=JSON.parse(readFileSync(handoffPath,'utf8'));
assert.equal(handoff.format,'bc1q21-professional-two-release-calendar-offline-handoff-v1');
assert.equal(handoff.network,'regtest');
assert.equal(handoff.publicOnly,true);
assert.equal(handoff.signed,false);
assert.equal(handoff.broadcast,false);
assert.match(handoff.approvedPsbtSha256,/^[0-9a-f]{64}$/);
assert.match(handoff.fundingTxid,/^[0-9a-f]{64}$/);
const frames=readFileSync(framesPath,'utf8').split(/\r?\n/)
 .map(x=>x.trim()).filter(x=>/^ur:crypto-psbt\//i.test(x));
assert.ok(frames.length>0&&frames.length<=512,'Expected Jade signed QR records');
const decoder=new URDecoder();
for(const frame of frames)decoder.receivePart(frame);
assert.ok(decoder.isComplete()&&decoder.isSuccess(),'Incomplete signed Jade QR');
assert.equal(decoder.resultUR().type,'crypto-psbt');
const signed=Buffer.from(cbor.decodeFirstSync(Buffer.from(decoder.resultUR().cbor))).toString('base64');
const result=finalizeVerifiedProfessionalRelease(
 handoff.unsignedPsbtBase64,signed,handoff.approvedPsbtSha256);
assert.equal(result.signatureCryptographicallyVerified,true);
assert.equal(result.broadcast,false);
const port=Number(process.env.REGTEST_RPC_PORT||18443);
const username=process.env.REGTEST_RPC_USER||'professional';
const password=process.env.REGTEST_RPC_PASSWORD||'synthetic-only';
const payload=JSON.stringify({jsonrpc:'1.0',id:'calendar-jade-return',method:'testmempoolaccept',
 params:[[result.rawTransactionHex]]});
const acceptance=await new Promise((resolve,reject)=>{
 const req=http.request({hostname:'127.0.0.1',port,path:'/',method:'POST',headers:{
  authorization:'Basic '+Buffer.from(username+':'+password).toString('base64'),
  'content-type':'application/json','content-length':Buffer.byteLength(payload)
 }},res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>{
  try{const parsed=JSON.parse(body);if(parsed.error)reject(Error(JSON.stringify(parsed.error)));
   else resolve(parsed.result)}catch(e){reject(e)}
 })});
 req.on('error',reject);req.end(payload);
});
assert.equal(acceptance?.length,1);
assert.equal(acceptance[0].allowed,true,
 'Bitcoin Core rejected signed release: '+JSON.stringify(acceptance[0]));
assert.equal(acceptance[0].txid,result.txid,'Bitcoin Core transaction ID differs');
console.log('PASS_PROFESSIONAL_EXACT_CALENDAR_JADE_RETURN',JSON.stringify({
 network:'regtest',txid:result.txid,signatureVerified:true,
 bitcoinCoreAccepted:true,broadcast:false
}));
