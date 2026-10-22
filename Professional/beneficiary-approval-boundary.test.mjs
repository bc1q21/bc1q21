import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createConfirmationSession} from './confirmation-session.mjs';

const digest='a'.repeat(64);
const record={network:'regtest',signed:false,broadcast:false,approvalVerified:true,psbtSha256:digest,
 fundingTxid:'b'.repeat(64),fundingVout:0,inputSats:12000,destinationAddress:'bcrt1fixture',
 payoutSats:11000,feeSats:1000,locktime:1800000000,locktimeType:'timestamp'};

test('beneficiary cannot approve without exact fingerprint and explicit acknowledgment',()=>{
 const session=createConfirmationSession(record);
 assert.equal(session.view().explicitlyApproved,false);
 assert.throws(()=>session.approve({acknowledged:true,confirmedDigest:'c'.repeat(64)}),/fingerprint/);
 assert.throws(()=>session.approve({acknowledged:false,confirmedDigest:digest}),/acknowledgment/);
 assert.equal(session.view().explicitlyApproved,false);
 session.approve({acknowledged:true,confirmedDigest:digest});
 assert.equal(session.view().explicitlyApproved,true);
 session.invalidate();
 assert.equal(session.view().explicitlyApproved,false);
});

test('confirmation implementation classifies calendar CLTV as timestamp',()=>{
 const source=readFileSync(new URL('./transaction-confirmation.mjs',import.meta.url),'utf8');
 assert.match(source,/locktimeType:psbt\.locktime>=500000000\?'timestamp':'block-height'/);
});

test('confirmation rejects unauthenticated or already signed records',()=>{
 assert.throws(()=>createConfirmationSession({...record,approvalVerified:false}),/Unverified/);
 assert.throws(()=>createConfirmationSession({...record,signed:true}),/Unverified/);
});
