// Integration test: retail date progression -> public account keys -> CLTV scripts.
// All wallet material is a disposable synthetic test fixture. No live gift.
import assert from 'node:assert/strict';
import {HDKey} from '@scure/bip32';
import {createHash} from 'node:crypto';
import {retailSchedule} from './retail-date-policy-reference.mjs';
import {cltvScript} from './verify-recovered-date-scripts.mjs';
const h160=b=>createHash('ripemd160').update(createHash('sha256').update(b).digest()).digest('hex');
const account=HDKey.fromMasterSeed(Buffer.alloc(32,7)).derive("m/84'/0'/0'");
function expectedOutputs(dates){
 return dates.map((date,i)=>{
  const pub=Buffer.from(account.deriveChild(1).deriveChild(i).publicKey);
  const time=Math.floor(Date.parse(date+'T00:00:00Z')/1000);
  return {script:'a914'+h160(cltvScript(time,pub))+'87',date,index:i};
 });
}
function matches(firstDate,count,interval,outputScripts){
 const dates=retailSchedule(firstDate,count,interval);
 const expected=expectedOutputs(dates).map(x=>x.script);
 return expected.length===outputScripts.length &&
   expected.every((value,index)=>value===outputScripts[index]);
}
for(const [date,n,interval] of [
 ['2031-05-17',24,'year'],
 ['2032-02-29',4,'year'],
 ['2031-01-31',4,'month'],
 ['2031-12-31',3,'month'],
 ['2031-07-19',1,'year']
]){
 const dates=retailSchedule(date,n,interval);
 const outputs=expectedOutputs(dates).map(x=>x.script);
 assert.equal(matches(date,n,interval,outputs),true);
 assert.equal(matches('2031-05-18',n,interval,outputs),false);
 const modified=[...outputs];modified[0]='a914'+'ee'.repeat(20)+'87';
 assert.equal(matches(date,n,interval,modified),false);
 const truncated=outputs.slice(0,-1);
 assert.equal(matches(date,n,interval,truncated),false);
 console.log('PASS retail date progression and public CLTV script agreement:',n,interval,'releases');
}
console.log('BOUNDARY: synthetic public math only; no actual gift-link provenance, Jade date decryption, or real-world gift restore');
