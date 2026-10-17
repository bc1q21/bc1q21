import assert from 'node:assert/strict';
import {HDKey} from '@scure/bip32';
import {createHash} from 'node:crypto';
import {annualSchedule,cltvScript,verifyRecoveredAnnualDate} from './verify-recovered-date-scripts.mjs';
const hash160=b=>createHash('ripemd160').update(createHash('sha256').update(b).digest()).digest('hex');
// Disposable deterministic BIP32 fixture inside ephemeral test process only.
const acct=HDKey.fromMasterSeed(Buffer.alloc(32,7)).derive("m/84'/0'/0'");
const other=HDKey.fromMasterSeed(Buffer.alloc(32,8)).derive("m/84'/0'/0'");
const firstDate='2031-05-17';
for(const count of [1,4,24]){
 const dates=annualSchedule(firstDate,count);
 const outputs=dates.map((date,i)=>{
  const pub=Buffer.from(acct.deriveChild(1).deriveChild(i).publicKey);
  const locktime=Math.floor(Date.parse(date+'T00:00:00Z')/1000);
  const scriptPubKey='a914'+hash160(cltvScript(locktime,pub))+'87';
  return {vout:i+2,sats:12000+i*1000,scriptPubKey};
 });
 const args={firstDate,releaseCount:count,accountXpub:acct.publicExtendedKey,confirmedOutputs:outputs};
 const result=verifyRecoveredAnnualDate(args);
 assert.equal(result.status,'public-schedule-matched',result.reason);
 assert.equal(result.authenticated,false);
 assert.equal(result.verified.length,count);
 assert.equal(verifyRecoveredAnnualDate({...args,firstDate:'2031-05-18'}).status,'rejected',
  'Wrong but well-formed date must fail against funded scripts');
 assert.equal(verifyRecoveredAnnualDate({...args,accountXpub:other.publicExtendedKey}).status,'rejected');
 const changed=structuredClone(outputs);changed[0].scriptPubKey='a914'+'aa'.repeat(20)+'87';
 assert.equal(verifyRecoveredAnnualDate({...args,confirmedOutputs:changed}).status,'rejected');
 const missing=outputs.slice(1);
 assert.equal(verifyRecoveredAnnualDate({...args,confirmedOutputs:missing}).status,'rejected');
 if(count>1) {
  const duplicated=structuredClone(outputs);
  duplicated[1]=structuredClone(duplicated[0]);
  assert.equal(verifyRecoveredAnnualDate({...args,confirmedOutputs:duplicated}).status,'rejected');
 }
 console.log('PASS first-date public CLTV binding with',count,'annual outputs; wrong date/wallet/outputs rejected');
}
assert.throws(()=>annualSchedule('2032-02-29',4),'Leap-day unsupported in this simple annual policy');
assert.throws(()=>annualSchedule('2031-02-30',4));
console.log('BOUNDARY: This proves only exact public script matching, NOT offline device-origin authentication, encrypted metadata recovery, real gift link or retail calendar policy');
