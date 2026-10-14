import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveJadePublicCltvHandoff } from './jade-xpub-cltv-handoff.mjs';
import { retailDateToCltvTimestamp } from './retail-calendar-cltv.mjs';
import { verifyPublicRetailSchedule } from './public-retail-schedule-verify.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
function scripts(dates) {
 return dates.map((date,index)=>deriveJadePublicCltvHandoff({
   accountXpub,masterFingerprintHex,childIndex:index,locktime:retailDateToCltvTimestamp(date)
 }).fundingScriptPubKeyHex);
}
test('verify retail monthly schedule against independently derived gift scripts',()=>{
 const dates=['2031-01-15','2031-02-15','2031-03-15'];
 const result=verifyPublicRetailSchedule({accountXpub,masterFingerprintHex,firstDate:dates[0],
   interval:'month',outputScriptsHex:scripts(dates)});
 assert.deepEqual(result.releases.map(x=>x.date),dates);
 assert.equal(result.verifiedAgainstOutputScripts,true);
 assert.equal(result.secretsReceived,false);
});
test('verify retail yearly schedule with Feb 29 calendar rollover',()=>{
 // JS Date.UTC matches retail: leap day advances to March 1 on non-leap year.
 const dates=['2028-02-29','2029-03-01','2030-03-01'];
 const result=verifyPublicRetailSchedule({accountXpub,masterFingerprintHex,firstDate:dates[0],
   interval:'year',outputScriptsHex:scripts(dates)});
 assert.deepEqual(result.releases.map(x=>x.date),dates);
});
test('reject altered output script, false date, false interval',()=>{
 const dates=['2031-01-15','2031-02-15'];
 const outputScriptsHex=scripts(dates);
 for(const patch of [
  {outputScriptsHex:[outputScriptsHex[0],'a914'+'00'.repeat(20)+'87']},
  {firstDate:'2031-01-16'},
  {interval:'year'}
 ]) assert.throws(()=>verifyPublicRetailSchedule({accountXpub,masterFingerprintHex,
   firstDate:dates[0],interval:'month',outputScriptsHex,...patch}));
});
