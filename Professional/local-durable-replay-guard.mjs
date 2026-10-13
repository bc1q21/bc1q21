// Isolated regtest-only durable outpoint claim ledger.
// Exclusive file creation blocks duplicate claims across cooperating processes
// sharing ONE local filesystem. No secrets, network access or broadcast.
// NOT a distributed lock, blockchain UTXO check, or production-grade database.
import { mkdirSync, openSync, writeSync, fsyncSync, closeSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const fail=m=>{throw Error('Professional durable replay guard: '+m)};
const validate=(txid,vout)=>{
 if(typeof txid!=='string'||!/^[a-f0-9]{64}$/i.test(txid)||
  !Number.isSafeInteger(vout)||vout<0||vout>0xffffffff)fail('Invalid public outpoint');
 return txid.toLowerCase()+':'+vout;
};
export function createLocalDurableProfessionalReplayGuard(directory){
 if(typeof directory!=='string'||!directory.trim())fail('Explicit ledger directory required');
 const root=resolve(directory);
 mkdirSync(root,{recursive:true,mode:0o700});
 const filename=key=>join(root,key.replace(':','-')+'.claim');
 return Object.freeze({
  claim:(txid,vout)=>{
   const key=validate(txid,vout);
   let fd;
   try{fd=openSync(filename(key),'wx',0o600)}
   catch(e){if(e?.code==='EEXIST')fail('Funding outpoint already claimed');throw e}
   try{writeSync(fd,JSON.stringify({version:1,network:'regtest',outpoint:key,claimed:true})+'\n');fsyncSync(fd)}
   finally{closeSync(fd)}
   return true;
  },
  has:(txid,vout)=>{
   const key=validate(txid,vout);
   try{
    const record=JSON.parse(readFileSync(filename(key),'utf8'));
    if(record.version!==1||record.network!=='regtest'||record.outpoint!==key||record.claimed!==true)
     fail('Invalid persisted claim record');
    return true;
   }catch(e){if(e?.code==='ENOENT')return false;throw e}
  }
 });
}
