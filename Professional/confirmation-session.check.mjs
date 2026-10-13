import assert from 'node:assert/strict';
import { createConfirmationSession } from './confirmation-session.mjs';
const digest='ab'.repeat(32);
const record=Object.freeze({network:'regtest',psbtSha256:digest,approvalVerified:true,signed:false,broadcast:false,
 destinationAddress:'bcrt1qexample',payoutSats:99000,feeSats:1000,locktime:110});
const session=createConfirmationSession(record);
assert.equal(session.view().explicitlyApproved,false,'Viewing must not approve');
assert.throws(()=>session.approve(),/Explicit acknowledgment/);
assert.throws(()=>session.approve({confirmedDigest:digest,acknowledged:false}),/Explicit acknowledgment/);
assert.throws(()=>session.approve({confirmedDigest:'cd'.repeat(32),acknowledged:true}),/Explicit acknowledgment/);
assert.equal(session.view().explicitlyApproved,false,'Rejected approvals must not advance');
const confirmation=session.approve({confirmedDigest:digest,acknowledged:true});
assert.equal(confirmation.explicitlyApproved,true);
assert.equal(confirmation.signed,false);assert.equal(confirmation.broadcast,false);
assert.equal(session.view().explicitlyApproved,true);
session.invalidate();
assert.equal(session.view().explicitlyApproved,false,'Invalidation must revoke approval');
for(const changes of [{network:'mainnet'},{signed:true},{broadcast:true},{approvalVerified:false},{psbtSha256:'bad'}]){
 assert.throws(()=>createConfirmationSession({...record,...changes}),/Unverified regtest record/);
}
console.log('PASS: viewing does not approve; exact fingerprint and explicit acknowledgment required; invalidation revokes');
