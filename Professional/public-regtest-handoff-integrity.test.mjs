import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePublicRegtestHandoff,verifyPublicRegtestHandoff} from './public-regtest-handoff-integrity.mjs';
const sample={unsignedPsbtBase64:Buffer.from('70736274ff000000','hex').toString('base64'),
 fundingTxid:'a'.repeat(64),vout:0,inputSats:100000,locktime:110,destinationSats:99000};
test('public-only handoff is checksummed and round-trips',()=>{
 const record=preparePublicRegtestHandoff(sample);
 assert.equal(record.network,'regtest');
 assert.equal(record.psbtSha256.length,64);
 assert.equal(verifyPublicRegtestHandoff(record).psbtSha256,record.psbtSha256);
});
test('checksum tampering and extra secret fields are rejected',()=>{
 const record=preparePublicRegtestHandoff(sample);
 assert.throws(()=>verifyPublicRegtestHandoff({...record,psbtSha256:'0'.repeat(64)}));
 assert.throws(()=>verifyPublicRegtestHandoff({...record,seed:'forbidden'}));
 assert.throws(()=>verifyPublicRegtestHandoff({...record,network:'main'}));
});
test('rejects invalid base64, missing PSBT magic and impossible fee',()=>{
 assert.throws(()=>preparePublicRegtestHandoff({...sample,unsignedPsbtBase64:'not-a-psbt'}));
 assert.throws(()=>preparePublicRegtestHandoff({...sample,unsignedPsbtBase64:Buffer.from('wrong').toString('base64')}));
 assert.throws(()=>preparePublicRegtestHandoff({...sample,destinationSats:100000}));
});
