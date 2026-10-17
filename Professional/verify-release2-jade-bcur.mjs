// Disposable regtest Jade response decoder; no private key material.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {URDecoder} from '@ngraveio/bc-ur';
import cbor from 'cbor';
const [framePath,originalJson,outPath] = process.argv.slice(2);
assert.ok(framePath && originalJson && outPath);
const frames=readFileSync(framePath,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(x=>/^ur:crypto-psbt\//i.test(x));
assert.ok(frames.length>=7,'Insufficient frames');
const decoder=new URDecoder();
for(const frame of frames) decoder.receivePart(frame);
assert.equal(decoder.isComplete(),true,'Incomplete signed PSBT QR data');
assert.equal(decoder.isSuccess(),true,'Invalid signed PSBT QR data');
assert.equal(decoder.resultUR().type,'crypto-psbt');
const signed=Buffer.from(cbor.decodeFirstSync(Buffer.from(decoder.resultUR().cbor)));
assert.equal(signed.subarray(0,5).toString('hex'),'70736274ff');
const record=JSON.parse(readFileSync(originalJson,'utf8'));
assert.equal(record.network,'regtest');
assert.equal(record.chainHeight,121);
const orig=Buffer.from(record.releases[1].unsignedPsbtBase64,'base64');
function readCompact(data,p){const code=data[p++];if(code<253)return [code,p];let l=code==253?2:code==254?4:8;const n=Number(data.readBigUInt64LE ? (l==8?data.readBigUInt64LE(p):l==4?data.readUInt32LE(p):data.readUInt16LE(p)):0);return [n,p+l];}
function entries(b){
 let p=5,maps=[];
 while(p<b.length){const m=new Map();while(true){let k,v;[k,p]=readCompact(b,p);if(!k)break;const key=b.subarray(p,p+k);p+=k;[v,p]=readCompact(b,p);const val=b.subarray(p,p+v);p+=v;m.set(key.toString('hex'),Buffer.from(val));}maps.push(m);}
 return maps;
}
const [sGlobal,sIn]=entries(signed),[uGlobal,uIn]=entries(orig);
assert.ok(sGlobal.has('00') && uGlobal.has('00'));
assert.deepEqual(sGlobal.get('00'),uGlobal.get('00'),'Jade changed unsigned transaction');
assert.ok([...sIn.keys()].some(k=>k.startsWith('02')&&k.length===68),'Missing Jade partial signature');
assert.ok(sIn.has('04'),'Missing redeem script');
const sum=createHash('sha256').update(signed).digest('hex');
writeFileSync(outPath,signed,{mode:0o600});
console.log('PASS_RELEASE2_BCUR_COMPLETE_UNSIGNED_TRANSACTION_IDENTICAL',JSON.stringify({frames:frames.length,signedPsbtSha256:sum,signedBytes:signed.length,origBytes:orig.length}));
