import assert from 'node:assert/strict';
import {assessClaimReadiness,publicOnlyProof} from './recipient-claim-readiness-gate.mjs';
const base=publicOnlyProof();
const blocked=assessClaimReadiness(base);
assert.equal(blocked.ready,false);
assert.equal(blocked.status,'blocked');
assert.ok(blocked.failures.some(x=>x.includes('Offline date recovery')));
assert.ok(blocked.failures.some(x=>x.includes('Gift-card link')));
const required=['giftIdBound','onChainFunded','publicScriptsMatched','dateScriptMatched','offlineDateRecoveryAuthenticated','offlineSignerReady','psbtVerified','matured','unspent','recipientDestinationVerified'];
const allTrue={...base};for(const field of required)allTrue[field]=true;
const ready=assessClaimReadiness(allTrue);
assert.equal(ready.ready,true);
assert.equal(ready.status,'eligible-for-user-approval');
for(const field of required){
 const bad=assessClaimReadiness({...allTrue,[field]:false});
 assert.equal(bad.ready,false,field+' must block');
 assert.ok(bad.failures.length>=1);
}
assert.equal(assessClaimReadiness({...allTrue,network:'mainnet'}).ready,false);
assert.equal(assessClaimReadiness({...allTrue,offlineDateRecoveryAuthenticated:'true'}).ready,false);
assert.equal(assessClaimReadiness({...allTrue,extraField:true}).ready,false);
assert.equal(assessClaimReadiness(null).ready,false);
console.log('PASS fail-closed signing gate rejects public-only status, every missing check, mainnet and malformed attestations');
console.log('BOUNDARY: boolean flags are NOT cryptographic proof; producer provenance and hardware verification still require dedicated authenticated evidence');
