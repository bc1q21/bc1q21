// bc1q21 Professional: allowlist for disposable Bitcoin Core regtest chain snapshot.
// Only blocks/ and chainstate/ are eligible. No wallets, cookies, conf, logs or keys.
// This is an allowlist/checksum helper, NOT a snapshot or a backup implementation.
import {createHash} from 'node:crypto';
const hex64=/^[0-9a-f]{64}$/;
const leveldb=/^(?:CURRENT|LOCK|LOG(?:\.old)?|MANIFEST-[0-9]+|OPTIONS-[0-9]+|[0-9]+\.(?:ldb|sst|log))$/;
export function validateSnapshotRelativePath(path) {
 if(typeof path!=='string'||path.length>512||path.includes('\\')||
    path.startsWith('/')||path.includes('\0'))throw Error('Unsafe snapshot path');
 const parts=path.split('/');
 if(parts.some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe snapshot path segments');
 const [dir,...rest]=parts;
 if(dir==='blocks') {
  if(rest.length===1&&(rest[0]==='xor.dat'||/^(?:blk|rev)[0-9]{5}\.dat$/.test(rest[0])))return path;
  if(rest.length===2&&rest[0]==='index'&&leveldb.test(rest[1]))return path;
 }
 if(dir==='chainstate'&&rest.length===1&&leveldb.test(rest[0]))return path;
 throw Error('Not allowlisted regtest blockchain data');
}
export function createSnapshotFileManifest(files) {
 if(!Array.isArray(files)||files.length===0||files.length>50000)throw Error('Invalid file list');
 const names=new Set();
 const result=files.map(f=>{
  if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).sort().join(',')!=='bytes,path')
   throw Error('Invalid snapshot entry');
  const path=validateSnapshotRelativePath(f.path);
  if(names.has(path))throw Error('Duplicate snapshot path');
  names.add(path);
  if(!Buffer.isBuffer(f.bytes))throw Error('Snapshot file must be a Buffer');
  return {path,size:f.bytes.length,sha256:createHash('sha256').update(f.bytes).digest('hex')};
 }).sort((a,b)=>a.path.localeCompare(b.path,'en'));
 return Object.freeze({format:'bc1q21-professional-regtest-chain-files-v1',network:'regtest',files:result});
}
export function verifySnapshotFileManifest(manifest,files) {
 if(!manifest||manifest.format!=='bc1q21-professional-regtest-chain-files-v1'||
    manifest.network!=='regtest'||!Array.isArray(manifest.files))throw Error('Invalid regtest snapshot manifest');
 const actual=createSnapshotFileManifest(files);
 if(actual.files.length!==manifest.files.length)throw Error('Snapshot file count changed');
 for(let i=0;i<actual.files.length;i++){
  const a=actual.files[i],b=manifest.files[i];
  if(!b||a.path!==b.path||a.size!==b.size||!hex64.test(b.sha256)||a.sha256!==b.sha256)
   throw Error('Snapshot file checksum or path mismatch');
 }
 return true;
}
