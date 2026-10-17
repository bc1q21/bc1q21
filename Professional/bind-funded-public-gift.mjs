// bc1q21 Professional: binding a CONFIRMED isolated regtest 24-output transaction
// to a disposable watch-only account xpub and public gift-card locator.
// This is NOT recipient ownership authentication or first-date recovery.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {verifyWatchOnlyGift} from './verify-watchonly-xpub-gift.mjs';
const [publicPath,evidencePath,outputPath]=process.argv.slice(2);
assert.ok(publicPath&&evidencePath&&outputPath);
const fixture=JSON.parse(readFileSync(publicPath,'utf8'));
const evidence=JSON.parse(readFileSync(evidencePath,'utf8'));
const reject=m=>{throw new Error('Public funded gift proof rejected: '+m);};
export function bindEvidence(publicData,proof) {
  assert.equal(publicData.format,'bc1q21-professional-watchonly-review-v1');
  assert.equal(publicData.network,'regtest');
  assert.equal(publicData.privateKeysIncluded,false);
  assert.equal(proof.format,'bc1q21-professional-single-regtest-gift-discovery-v1');
  assert.equal(proof.network,'regtest');
  assert.equal(proof.blockHeight,122);
  assert.equal(proof.fundingInputOriginConfirmed,true);
  assert.equal(proof.all24OutputsFundedAndUnspent,true);
  assert.equal(proof.xpubOriginAuthenticated,false);
  assert.equal(proof.giftLinkOwnershipAuthenticated,false);
  assert.equal(proof.jadeRecoveryProven,false);
  assert.equal(proof.dateDecryptProven,false);
  assert.match(proof.fundingTxid,/^[a-f0-9]{64}$/);
  assert.match(proof.giftLinkFundingAddress,/^bcrt1[a-z0-9]{10,}$/);
  assert.equal(publicData.descriptors.length,24);
  assert.equal(proof.releaseOutputs.length,24);
  const expected=new Map(publicData.descriptors.map(d=>[d.scriptPubKey,d]));
  assert.equal(expected.size,24);
  const observed=new Set();
  const outputs=[];
  for(const r of proof.releaseOutputs) {
    assert.ok(Number.isInteger(r.index)&&r.index>=0&&r.index<24);
    assert.ok(Number.isInteger(r.vout)&&r.vout>=0);
    assert.ok(!observed.has(r.vout),'Duplicate real transaction output index');
    observed.add(r.vout);
    const d=expected.get(r.scriptPubKey);
    assert.ok(d,'Unrecognized funded locking script');
    assert.equal(d.index,r.index,'Derived key index does not match confirmed output');
    assert.equal(d.sats,r.sats,'Confirmed transaction amount mismatch');
    outputs.push({vout:r.vout,sats:r.sats,scriptPubKey:r.scriptPubKey});
  }
  assert.equal(outputs.length,24);
  const descriptors=publicData.descriptors.map(d=>{
    const found=proof.releaseOutputs.find(r=>r.scriptPubKey===d.scriptPubKey);
    assert.ok(found);
    return {...d,vout:found.vout};
  });
  const locator={fundingAddress:proof.giftLinkFundingAddress,interval:'year'};
  const candidates=[{txid:proof.fundingTxid,outputs}];
  const verification=verifyWatchOnlyGift({locator,candidates,descriptors,accountXpub:publicData.accountXpub});
  assert.equal(verification.status,'watch-only-script-match',verification.reason);
  assert.equal(verification.authenticated,false);
  return {...publicData,locator,candidates,descriptors,
    fundingEvidence:{verifiedRegtestOutputs:24,snapshotHeight:122,
      fundingInputOriginConfirmed:true,recipientOwnershipAuthenticated:false,
      genuineRetailGiftLinkProven:false,scheduleRecovered:false,
      fundingTxid:proof.fundingTxid}};
}
if(process.argv[1].endsWith('bind-funded-public-gift.mjs')){
 const bound=bindEvidence(fixture,evidence);
 writeFileSync(outputPath,JSON.stringify(bound,null,2)+'\n',{mode:0o600});
 console.log('PASS one actual regtest-funded 24-output transaction bound to watch-only CLTV descriptors and public gift locator');
 console.log('BOUNDARY: gift-link provenance, xpub ownership and encrypted recipient schedule NOT proven');
}
