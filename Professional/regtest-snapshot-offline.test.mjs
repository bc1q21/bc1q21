import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {exportStoppedRegtestSnapshot,restoreOfflineRegtestSnapshot,verifyOfflineRegtestSnapshot} from './regtest-snapshot-offline.mjs';
test('offline snapshot roundtrip with xor and empty LevelDB metadata',()=>{
 const root=mkdtempSync(join(tmpdir(),'bc1q21-snapshot-test-'));
 const src=join(root,'source'),snap=join(root,'snapshot'),restored=join(root,'restored');
 try {
  mkdirSync(join(src,'regtest','blocks'),{recursive:true});
  mkdirSync(join(src,'regtest','chainstate'),{recursive:true});
  writeFileSync(join(src,'.bc1q21-professional-disposable-regtest'),JSON.stringify({purpose:'bc1q21-professional-disposable-regtest',acknowledged:true}));
  writeFileSync(join(src,'regtest','blocks','blk00000.dat'),Buffer.from('synthetic regtest fixture'));
  writeFileSync(join(src,'regtest','blocks','xor.dat'),Buffer.alloc(8));
  writeFileSync(join(src,'regtest','chainstate','CURRENT'),Buffer.alloc(0));
  writeFileSync(join(src,'regtest','chainstate','000001.ldb'),Buffer.from('test'));
  writeFileSync(join(src,'regtest','wallet.dat'),'must not export');
  assert.throws(()=>exportStoppedRegtestSnapshot(src,snap),/shutdown/);
  const m=exportStoppedRegtestSnapshot(src,snap,{coreStopped:true});
  assert.equal(m.files.some(f=>f.path==='blocks/xor.dat'),true);
  assert.equal(m.files.some(f=>f.path.includes('wallet')),false);
  assert.equal(verifyOfflineRegtestSnapshot(snap).network,'regtest');
  restoreOfflineRegtestSnapshot(snap,restored);
  assert.equal(readFileSync(join(restored,'regtest','blocks','blk00000.dat'),'utf8'),'synthetic regtest fixture');
  assert.throws(()=>restoreOfflineRegtestSnapshot(snap,restored),/must not exist/);
  writeFileSync(join(snap,'blocks','blk00000.dat'),'tampered');
  assert.throws(()=>verifyOfflineRegtestSnapshot(snap),/checksum/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
