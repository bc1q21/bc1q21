import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPublicDeviceComparisonVectors} from './public-device-comparison-vectors.mjs';
import {comparePublicDeviceCltvObservations} from './public-device-cltv-observation-check.mjs';
const fixture=()=>({accountXpub:'xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78',
 masterFingerprintHex:'e29ac13c',releaseDates:['2031-01-15','2031-02-15','2031-03-15','2031-04-15']});
const observed=()=>buildPublicDeviceComparisonVectors(fixture()).releases.map(x=>({...x}));
test('four public device observations match disposable expected CLTV outputs',()=>{
 const result=comparePublicDeviceCltvObservations(fixture(),observed());
 assert.equal(result.matchedReleaseCount,4);
 assert.equal(result.publicVectorsMatch,true);
 assert.equal(result.deviceIdentityVerified,false);
 assert.equal(result.aesCompatibilityVerified,false);
 assert.equal(result.cltvSigningVerified,false);
});
test('rejects changed CLTV script, address, derivation path or unexpected fields',()=>{
 for(const change of [
  {redeemScriptHex:'00'},
  {fundingAddress:'2wrong'},
  {derivationPath:"m/84'/0'/0'/1/8"},
  {unexpected:'field'}
 ]){
  const o=observed();Object.assign(o[2],change);
  assert.throws(()=>comparePublicDeviceCltvObservations(fixture(),o));
 }
});
test('rejects missing or reordered observations',()=>{
 assert.throws(()=>comparePublicDeviceCltvObservations(fixture(),observed().slice(1)));
 const o=observed();[o[0],o[1]]=[o[1],o[0]];
 assert.throws(()=>comparePublicDeviceCltvObservations(fixture(),o));
});
