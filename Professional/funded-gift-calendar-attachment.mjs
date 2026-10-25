// Professional-only read-only schedule attachment.
// Height-CLTV historical outputs cannot be relabeled as calendar-timestamp releases.
import assert from 'node:assert/strict';
export function attachVerifiedPublicCalendarToGift(view, published, verifiedSchedule) {
 assert.equal(view?.network,'regtest');
 assert.equal(view?.canSign,false);
 assert.equal(view?.canBroadcast,false);
 assert.equal(view?.releaseCount,view?.releases?.length);
 assert.ok(published&&typeof published==='object','Published calendar evidence required');
 assert.ok(verifiedSchedule&&verifiedSchedule.verifiedAgainstOutputScripts===true,'Verified public schedule required');
 assert.equal(verifiedSchedule.releaseCount,view.releaseCount,'Release count mismatch');
 assert.ok(Array.isArray(published.outputScriptsHex),'Published release scripts required');
 assert.equal(published.outputScriptsHex.length,view.releaseCount,'Script count mismatch');
 const releases=view.releases.map((r,i)=>{
  const schedule=verifiedSchedule.releases[i];
  assert.equal(schedule?.index,i,'Calendar index mismatch');
  assert.equal(published.outputScriptsHex[i]?.toLowerCase(),r.scriptPubKeyHex.toLowerCase(),
   'Published calendar script differs from funded gift output '+i);
  assert.equal(schedule.fundingScriptPubKeyHex?.toLowerCase(),r.scriptPubKeyHex.toLowerCase(),
   'Derived calendar script differs from funded gift output '+i);
  assert.ok(Number.isSafeInteger(schedule.locktime)&&schedule.locktime>=500000000,
   'Calendar locktime must use Bitcoin timestamp semantics');
  assert.match(schedule.date,/^\d{4}-\d{2}-\d{2}$/);
  return Object.freeze({...r,date:schedule.date,locktime:schedule.locktime});
 });
 return Object.freeze({...view,releases:Object.freeze(releases),
  schedulePublished:true,calendarScriptsMatched:true,
  chainProvenanceAuthenticated:false,creatorAuthenticated:false,
  beneficiaryAuthorized:false,canExportSigningQr:false,canSign:false,canBroadcast:false});
}
