import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileDurableNonceStore } from './file-durable-nonce-store.mjs';

test('filesystem nonce claim is retained across fresh store instances',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'bc1q21-nonce-fixture-'));
 try {
  const key='bc1q21:professional:schedule:v1:'+'11'.repeat(16);
  assert.equal(await new FileDurableNonceStore({directory}).claimOnce(key),true);
  assert.equal(await new FileDurableNonceStore({directory}).claimOnce(key),false);
 } finally {await rm(directory,{recursive:true,force:true});}
});
test('concurrent claims cannot both succeed',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'bc1q21-nonce-fixture-'));
 try {
  const key='bc1q21:professional:schedule:v1:'+'22'.repeat(16);
  const claims=await Promise.all(Array.from({length:8},()=>new FileDurableNonceStore({directory}).claimOnce(key)));
  assert.equal(claims.filter(Boolean).length,1);
 } finally {await rm(directory,{recursive:true,force:true});}
});
test('reject unexpected keys and relative directory',async()=>{
 assert.throws(()=>new FileDurableNonceStore({directory:'relative/path'}));
 const directory=await mkdtemp(join(tmpdir(),'bc1q21-nonce-fixture-'));
 try {await assert.rejects(()=>new FileDurableNonceStore({directory}).claimOnce('mnemonic'));}
 finally {await rm(directory,{recursive:true,force:true});}
});
