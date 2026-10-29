import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveRecipientReleaseKeysFromXpub} from './derive-recipient-release-keys.mjs';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
const xpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
test('matches previously verified Jade public derivation for all requested releases',()=>{
 const result=deriveRecipientReleaseKeysFromXpub({accountXpub:xpub,releaseCount:24});
 assert.equal(result.keys.length,24);
 for(const i of [0,1,10,23]){
  const known=deriveJadePublicCltvHandoff({accountXpub:xpub,masterFingerprintHex:'e29ac13c',
    childIndex:i,locktime:1798761600});
  assert.equal(result.keys[i].publicKeyHex,known.signerPubkeyHex);
  assert.equal(result.keys[i].path,`m/84'/0'/0'/1/${i}`);
 }
 assert.equal(result.accountXpubOriginAuthenticated,false);
 assert.equal(result.signingAuthorized,false);
});
test('rejects tampered xpub, private key prefix, invalid counts',()=>{
 for(const bad of ['',xpub.slice(0,-1)+'1','xprv'+xpub.slice(4)])
  assert.throws(()=>deriveRecipientReleaseKeysFromXpub({accountXpub:bad,releaseCount:2}));
 for(const n of [0,61,-1,1.5])
  assert.throws(()=>deriveRecipientReleaseKeysFromXpub({accountXpub:xpub,releaseCount:n}));
});
