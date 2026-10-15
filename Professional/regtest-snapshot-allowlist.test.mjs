import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSnapshotRelativePath,createSnapshotFileManifest,verifySnapshotFileManifest} from './regtest-snapshot-allowlist.mjs';
const files=[
 {path:'blocks/blk00000.dat',bytes:Buffer.from('regtest block bytes')},
 {path:'blocks/index/CURRENT',bytes:Buffer.from('MANIFEST-000001')},
 {path:'chainstate/000001.ldb',bytes:Buffer.from('regtest UTXO state')}
];
test('allowlists only Bitcoin Core blocks and chainstate files',()=>{
 for(const f of files)assert.equal(validateSnapshotRelativePath(f.path),f.path);
 for(const path of ['wallets/wallet.dat','bitcoin.conf','.cookie','debug.log','regtest/.cookie',
  'blocks/../../wallets/wallet.dat','/tmp/blocks/blk00000.dat','blocks\\blk00000.dat',
  'chainstate/secret.key','blocks/blk00000.dat/evil','blocks/../wallets/keys'])
  assert.throws(()=>validateSnapshotRelativePath(path));
});
test('checksums immutable regtest snapshot file list and rejects mutation',()=>{
 const m=createSnapshotFileManifest(files);
 assert.equal(m.network,'regtest');
 assert.equal(verifySnapshotFileManifest(m,files),true);
 assert.throws(()=>verifySnapshotFileManifest(m,files.map((f,i)=>i===0?{...f,bytes:Buffer.from('tampered')}:f)));
 assert.throws(()=>verifySnapshotFileManifest(m,files.slice(1)));
 assert.throws(()=>verifySnapshotFileManifest(m,[...files,files[0]]));
});
test('rejects malformed manifests and non-byte entries',()=>{
 const m=createSnapshotFileManifest(files);
 assert.throws(()=>verifySnapshotFileManifest({...m,network:'main'},files));
 assert.throws(()=>createSnapshotFileManifest([{path:'blocks/blk00000.dat',bytes:'string'}]));
});
