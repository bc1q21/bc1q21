// bc1q21 Professional: create/verify a portable, strictly public-only regtest package.
// NO private keys, wallet directories, credentials, hardware or public Bitcoin.
import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,copyFileSync,existsSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {verifyOfflineRegtestSnapshot} from './regtest-snapshot-offline.mjs';
import {validateSnapshotRelativePath} from './regtest-snapshot-allowlist.mjs';
import {validateRegtestFundingCheckpoint} from './regtest-chain-continuity.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const marker='.bc1q21-professional-disposable-regtest';
const evidenceName='public-unsigned-cltv.json';
const snapshotManifestName='chain/manifest.json';
const packageManifestName='package-manifest.json';
const allowedPublic=new Set(['format','network','checkpoint','expectedChainTip','expectedChainHeight',
 'unsignedPsbtBase64','unsignedPsbtSha256','fundingTxHex','redeemScriptHex',
 'signerPubkeyHex','destinationScriptHex','inputSats','outputSats','feeSats',
 'locktime','signed','broadcast']);
function assertFile(path){
 const stat=lstatSync(path);
 if(!stat.isFile()||stat.isSymbolicLink())throw Error('Expected regular non-symlink file: '+path);
}
function assertDir(path){
 const stat=lstatSync(path);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Expected non-symlink directory: '+path);
}
function inspectPublicEvidence(path){
 assertFile(path);
 const bytes=readFileSync(path);
 if(bytes.length>250000)throw Error('Public PSBT evidence unexpectedly large');
 const e=JSON.parse(bytes.toString('utf8'));
 assert.deepEqual(Object.keys(e).sort(),[...allowedPublic].sort(),'Public-only schema mismatch');
 assert.equal(e.format,'bc1q21-professional-regtest-public-psbt-v1');
 assert.equal(e.network,'regtest');assert.equal(e.signed,false);assert.equal(e.broadcast,false);
 validateRegtestFundingCheckpoint(e.checkpoint);
 assert.equal(e.expectedChainTip,e.checkpoint.fundingBlockHash);
 assert.equal(e.expectedChainHeight,e.checkpoint.fundingBlockHeight);
 assert.equal(e.inputSats,100000);assert.equal(e.outputSats,99000);assert.equal(e.feeSats,1000);
 assert.equal(e.inputSats-e.outputSats,e.feeSats);
 assert.match(e.unsignedPsbtSha256,/^[0-9a-f]{64}$/);
 assert.match(e.unsignedPsbtBase64,/^[A-Za-z0-9+/]+={0,2}$/);
 assert.equal(sha256(Buffer.from(e.unsignedPsbtBase64,'base64')),e.unsignedPsbtSha256);
 assert.match(e.fundingTxHex,/^[0-9a-f]+$/);
 assert.match(e.redeemScriptHex,/^[0-9a-f]+$/);
 assert.match(e.signerPubkeyHex,/^(02|03)[0-9a-f]{64}$/);
 assert.match(e.destinationScriptHex,/^[0-9a-f]+$/);
 assert.equal(e.locktime,110);
 return {bytes,e};
}
function assertSnapshotExact(snapshot){
 assertDir(snapshot);
 const manifest=verifyOfflineRegtestSnapshot(snapshot);
 const allowed=new Set(['manifest.json',...manifest.files.map(f=>f.path)]);
 function walk(dir,prefix=''){
  for(const ent of readdirSync(dir,{withFileTypes:true})){
   const rel=prefix?prefix+'/'+ent.name:ent.name;
   const full=join(dir,ent.name);
   if(ent.isSymbolicLink())throw Error('Symlink forbidden: '+rel);
   if(ent.isDirectory()){if(!['blocks','blocks/index','chainstate'].includes(rel))
     throw Error('Unexpected directory in chain snapshot: '+rel);
    walk(full,rel);
   }else if(ent.isFile()){
    if(!allowed.has(rel))throw Error('Unexpected file in chain snapshot: '+rel);
    if(rel!=='manifest.json')validateSnapshotRelativePath(rel);
    allowed.delete(rel);
   }else throw Error('Unsupported snapshot filesystem entry');
  }
 }
 walk(snapshot);
 assert.equal(allowed.size,0,'Missing expected chain file');
 return manifest;
}
export function createPortablePublicRegtestPackage(snapshot,evidencePath,destination){
 const src=resolve(snapshot),dest=resolve(destination);
 if(existsSync(dest)||dest===src||dest.startsWith(src+'/')||src.startsWith(dest+'/'))
  throw Error('Package destination must be absent and separate');
 const manifest=assertSnapshotExact(src);
 const {bytes,e}=inspectPublicEvidence(evidencePath);
 assert.equal(e.checkpoint.scriptPubKeyHex.length,46);
 mkdirSync(join(dest,'chain'),{recursive:true});
 const records=[];
 function copy(name,from){
  const to=join(dest,name);
  mkdirSync(resolve(to,'..'),{recursive:true});
  copyFileSync(from,to);
  const data=readFileSync(to);
  records.push({path:name,size:data.length,sha256:sha256(data)});
 }
 copy(evidenceName,evidencePath);
 copy(snapshotManifestName,join(src,'manifest.json'));
 for(const file of manifest.files)copy('chain/'+file.path,join(src,file.path));
 records.sort((a,b)=>a.path.localeCompare(b.path,'en'));
 const pkg={format:'bc1q21-professional-portable-public-regtest-v1',network:'regtest',
  fundingTxid:e.checkpoint.fundingTxid,vout:e.checkpoint.vout,
  unsignedPsbtSha256:e.unsignedPsbtSha256,files:records};
 writeFileSync(join(dest,packageManifestName),JSON.stringify(pkg,null,2)+'\n',{flag:'wx',mode:0o600});
 verifyPortablePublicRegtestPackage(dest);
 return Object.freeze({fileCount:records.length,manifestSha256:sha256(readFileSync(join(dest,packageManifestName)))});
}
export function verifyPortablePublicRegtestPackage(directory){
 const root=resolve(directory);
 assertDir(root);
 const manifestPath=join(root,packageManifestName);
 assertFile(manifestPath);
 const pkg=JSON.parse(readFileSync(manifestPath,'utf8'));
 assert.deepEqual(Object.keys(pkg).sort(),['format','network','fundingTxid','vout','unsignedPsbtSha256','files'].sort());
 assert.equal(pkg.format,'bc1q21-professional-portable-public-regtest-v1');
 assert.equal(pkg.network,'regtest');
 const {e}=inspectPublicEvidence(join(root,evidenceName));
 assert.equal(pkg.fundingTxid,e.checkpoint.fundingTxid);
 assert.equal(pkg.vout,e.checkpoint.vout);
 assert.equal(pkg.unsignedPsbtSha256,e.unsignedPsbtSha256);
 const snap=assertSnapshotExact(join(root,'chain'));
 const expected=new Set([evidenceName,snapshotManifestName,...snap.files.map(f=>'chain/'+f.path)]);
 assert.equal(pkg.files.length,expected.size);
 const seen=new Set();
 for(const f of pkg.files){
  assert.deepEqual(Object.keys(f).sort(),['path','size','sha256'].sort());
  if(!expected.has(f.path)||seen.has(f.path))throw Error('Unexpected or duplicate package file');
  seen.add(f.path);
  const p=join(root,f.path);assertFile(p);
  const data=readFileSync(p);
  assert.equal(data.length,f.size,'Package size mismatch');
  assert.equal(sha256(data),f.sha256,'Package SHA-256 mismatch');
 }
 assert.equal(seen.size,expected.size);
 assert.deepEqual(readdirSync(root).sort(),['chain',evidenceName,packageManifestName].sort());
 return Object.freeze({verified:true,network:'regtest',fileCount:seen.size,
  fundingTxid:e.checkpoint.fundingTxid,vout:e.checkpoint.vout,
  unsignedPsbtSha256:e.unsignedPsbtSha256});
}
