import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {prepareProfessionalCustomerHandoff,verifyProfessionalCustomerHandoff} from './customer-recipient-handoff.mjs';
const gift=JSON.parse(readFileSync('Professional/artifacts/five-funded-recipient-gift-regtest.json'));
const psbts=JSON.parse(readFileSync('Professional/artifacts/five-funded-recipient-psbts-regtest.json'));
const pkg=prepareProfessionalCustomerHandoff({gift,psbts});
assert.equal(pkg.network,'regtest');
assert.equal(pkg.psbts.length,5);
const verified=verifyProfessionalCustomerHandoff(pkg,pkg.sha256);
assert.equal(verified.releaseCount,5);
assert.equal(verified.signingAuthorized,false);
assert.equal(verified.creatorIdentityAuthenticated,false);
assert.throws(()=>verifyProfessionalCustomerHandoff(pkg),/Independent authenticated digest/);
assert.throws(()=>verifyProfessionalCustomerHandoff(pkg,'00'.repeat(32)),/differs/);
assert.throws(()=>verifyProfessionalCustomerHandoff({...pkg,psbts:pkg.psbts.map((e,i)=>i===4?{...e,expectedApprovedSha256:'00'.repeat(32)}:e)},pkg.sha256),/digest mismatch/);
assert.throws(()=>prepareProfessionalCustomerHandoff({gift:{...gift,releases:gift.releases.slice(1)},psbts}),/Invalid gift release package/);
assert.throws(()=>prepareProfessionalCustomerHandoff({gift,psbts:psbts.map((e,i)=>
 i===1?{...e,approvedUnsignedBase64:psbts[0].approvedUnsignedBase64}:e)}),/digest mismatch|funding mismatch/);
assert.throws(()=>prepareProfessionalCustomerHandoff({gift,psbts:psbts.map((e,i)=>
 i===4?{...e,releaseNumber:1}:e)}),/numbering/);
assert.throws(()=>prepareProfessionalCustomerHandoff({gift,psbts:psbts.map((e,i)=>
 i===4?{...e,privateKey:'secret'}:e)}),/Unexpected evidence fields/);
// The independent fingerprint must cover every received field, including
// metadata an attacker tries to append without changing the committed body.
assert.throws(()=>verifyProfessionalCustomerHandoff({
 ...pkg,gift:{...pkg.gift,customerName:'Impersonated creator'}},pkg.sha256),/Noncanonical/);
assert.throws(()=>verifyProfessionalCustomerHandoff({
 ...pkg,gift:{...pkg.gift,releases:pkg.gift.releases.map((release,i)=>
 i===0?{...release,releaseLabel:'Matured and safe to sign'}:release)}},pkg.sha256),/Noncanonical/);
assert.throws(()=>verifyProfessionalCustomerHandoff({
 ...pkg,psbts:pkg.psbts.map((e,i)=>i===0?{...e,displayLabel:'Approved by creator'}:e)},pkg.sha256),
 /Unexpected evidence fields/);
assert.throws(()=>verifyProfessionalCustomerHandoff({
 ...pkg,gift:{...pkg.gift,releases:[...pkg.gift.releases].reverse()}},pkg.sha256),/Noncanonical/);
writeFileSync('Professional/artifacts/five-release-customer-handoff-regtest.json',JSON.stringify(pkg,null,2)+'\n');
console.log('PASS: five-release customer package binds all PSBTs, rejects tampering, requires independent digest.');
