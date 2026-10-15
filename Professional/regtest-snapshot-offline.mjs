// bc1q21 Professional: offline snapshot copy and integrity check.
// Must be invoked ONLY after Bitcoin Core has fully stopped. No process management,
// RPC, wallet, credentials, networking, signing, mining or broadcasting.
// Caller supplies a disposable source *regtest* datadir and an empty destination.
// Never run against Start9 or any live Bitcoin Core instance.
import {lstatSync,readdirSync,readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,relative,sep} from 'node:path';
import {createSnapshotFileManifest,verifySnapshotFileManifest,validateSnapshotRelativePath} from './regtest-snapshot-allowlist.mjs';
const marker='.bc1q21-professional-disposable-regtest';
function assertDisposable(root) {
 const dir=resolve(root);
 const st=lstatSync(dir);
 if(!st.isDirectory()||st.isSymbolicLink())throw Error('Directory must be real');
 const m=JSON.parse(readFileSync(join(dir,marker),'utf8'));
 if(m.purpose!=='bc1q21-professional-disposable-regtest'||m.acknowledged!==true)
  throw Error('Disposable regtest marker missing');
 return dir;
}
function inspect(root) {
 const base=join(root,'regtest');
 if(!existsSync(base)||lstatSync(base).isSymbolicLink())throw Error('regtest directory missing or linked');
 const entries=[];
 function walk(folder,rel='') {
  for(const item of readdirSync(folder,{withFileTypes:true})) {
   const sub=rel?rel+'/'+item.name:item.name;
   const path=join(folder,item.name);
   if(item.isSymbolicLink())throw Error('Symlink forbidden in regtest data');
   if(item.isDirectory()) {
    if(!['blocks','blocks/index','chainstate'].includes(sub))continue;
    walk(path,sub);
   } else if(item.isFile()) {
    try {validateSnapshotRelativePath(sub);}catch {continue;}
    entries.push({path:sub,bytes:readFileSync(path)});
   }
  }
 }
 walk(base);
 if(!entries.some(e=>e.path.startsWith('blocks/blk'))||!entries.some(e=>e.path.startsWith('chainstate/')))
  throw Error('Missing block or chainstate files');
 return entries;
}
export function exportStoppedRegtestSnapshot(source,destination,{coreStopped=false}={}) {
 if(coreStopped!==true)throw Error('Explicit clean Bitcoin Core shutdown required');
 const src=assertDisposable(source),dst=resolve(destination);
 if(dst===src||dst.startsWith(src+sep)||src.startsWith(dst+sep))throw Error('Overlapping source and destination');
 if(existsSync(dst))throw Error('Destination must not already exist');
 const files=inspect(src),manifest=createSnapshotFileManifest(files);
 // Validate all files and construct manifest BEFORE creating output.
 mkdirSync(dst,{recursive:false});
 for(const file of files) {
  const full=join(dst,file.path);
  mkdirSync(resolve(full,'..'),{recursive:true});
  writeFileSync(full,file.bytes,{flag:'wx',mode:0o600});
 }
 writeFileSync(join(dst,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
 return manifest;
}
export function verifyOfflineRegtestSnapshot(snapshot) {
 const root=resolve(snapshot);
 if(lstatSync(root).isSymbolicLink())throw Error('Snapshot symlink forbidden');
 const manifest=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));
 const files=[];
 for(const entry of manifest.files) {
  const name=validateSnapshotRelativePath(entry.path),full=join(root,name);
  if(lstatSync(full).isSymbolicLink())throw Error('Snapshot file symlink forbidden');
  files.push({path:name,bytes:readFileSync(full)});
 }
 verifySnapshotFileManifest(manifest,files);
 return manifest;
}
export function restoreOfflineRegtestSnapshot(snapshot,destination) {
 const manifest=verifyOfflineRegtestSnapshot(snapshot);
 const dst=resolve(destination);
 if(existsSync(dst))throw Error('Restoration destination must not exist');
 const src=resolve(snapshot);
 if(dst===src||dst.startsWith(src+sep)||src.startsWith(dst+sep))throw Error('Overlapping snapshot and destination');
 mkdirSync(join(dst,'regtest'),{recursive:true});
 for(const entry of manifest.files) {
  const name=validateSnapshotRelativePath(entry.path);
  const target=join(dst,'regtest',name);
  mkdirSync(resolve(target,'..'),{recursive:true});
  writeFileSync(target,readFileSync(join(src,name)),{flag:'wx',mode:0o600});
 }
 writeFileSync(join(dst,marker),JSON.stringify({purpose:'bc1q21-professional-disposable-regtest',acknowledged:true}),{flag:'wx',mode:0o600});
 return manifest;
}
