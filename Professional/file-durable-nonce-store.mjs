// Node-only durable claimOnce adapter for isolated Professional prototype.
// Requires an exclusive, local filesystem with atomic O_EXCL create semantics.
// No wallet secrets, network operations, signing, or Bitcoin broadcast.
import { mkdir, open, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export class FileDurableNonceStore {
 #directory;
 constructor({directory}) {
  if(typeof directory!=='string'||!directory.trim())throw Error('Absolute private storage directory required');
  if(!directory.startsWith('/'))throw Error('Absolute storage directory required');
  this.#directory=directory;
 }
 async claimOnce(key) {
  if(typeof key!=='string'|| !/^bc1q21:professional:schedule:v1:[0-9a-f]{32}$/.test(key))
   throw Error('Invalid schedule challenge key');
  await mkdir(this.#directory,{recursive:true,mode:0o700});
  const digest=createHash('sha256').update(key).digest('hex');
  const filename=join(this.#directory,digest+'.used');
  let handle;
  try {
   handle=await open(filename,'wx',0o600);
  } catch(error) {
   if(error?.code==='EEXIST')return false;
   throw error;
  }
  try {
   await handle.writeFile(key+'\n','utf8');
   await handle.sync();
  } catch(error) {
   // A failed write still burns this nonce: never unlink an uncertain claim.
   throw error;
  } finally {
   await handle.close();
  }
  // Sync directory metadata to reduce the chance a crash loses the new file.
  const dir=await open(this.#directory,'r');
  try {await dir.sync();} finally {await dir.close();}
  return true;
 }
}
