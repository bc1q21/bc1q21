// bc1q21 Professional watch-only key-to-CLTV funding proof.
// Public extended ACCOUNT key m/84'/0'/0' is derived *outside* the browser.
// This module consumes xpub only; it does not import mnemonics or private keys.
import assert from 'node:assert/strict';
import {HDKey} from '@scure/bip32';
import {verifyGiftPublicCandidate} from './verify-public-cltv-candidate.mjs';

export function verifyWatchOnlyGift({locator,candidates,descriptors,accountXpub}) {
  const reject=reason=>({status:'rejected',authenticated:false,reason});
  if(typeof accountXpub!=='string'||accountXpub.length>160||!accountXpub.startsWith('xpub'))
    return reject('A public mainnet-format account xpub is required');
  if(!Array.isArray(descriptors)||descriptors.length<1||descriptors.length>24)
    return reject('Missing or unsupported gift outputs');
  try{
    const account=HDKey.fromExtendedKey(accountXpub);
    // A non-hardened public /1/index path must be derived from account xpub.
    // No xprv, BIP39 phrase, wallet-derived secret or signed message is required.
    assert.ok(account.publicKey&&!account.privateKey,'The provided wallet key must be public-only');
    assert.equal(account.publicExtendedKey,accountXpub,'Wrong extended key representation');
    for(let i=0;i<descriptors.length;i++){
      const d=descriptors[i];
      assert.equal(d.path,`m/84'/0'/0'/1/${i}`,'Unexpected child derivation path');
      assert.ok(i<0x80000000,'Unexpected hardened child index');
      const derived=account.deriveChild(1).deriveChild(i);
      assert.ok(derived.publicKey&&!derived.privateKey,'Public derivation failed');
      assert.equal(Buffer.from(derived.publicKey).toString('hex'),d.publicKeyHex,
        'Candidate CLTV signer public key does not derive from provided account xpub');
    }
    const match=verifyGiftPublicCandidate(locator,candidates,descriptors);
    if(match.status!=='public-outputs-matched')return match;
    return {status:'watch-only-script-match',authenticated:false,
      reason:'Account-xpub children independently match candidate CLTV output scripts, but public xpub provenance, recipient ownership, original gift link and encrypted release schedule are NOT authenticated',
      matches:match.matches};
  }catch(error){return reject(error.message);}
}
