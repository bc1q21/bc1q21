// bc1q21 Professional isolated restoration consistency experiment.
// Entirely disposable BIP39 test mnemonic constructed in memory; never exported,
// logged, sent to a browser, or written into any test artifacts.
import assert from 'node:assert/strict';
import {HDKey} from '@scure/bip32';
import {mnemonicToSeedSync,entropyToMnemonic,validateMnemonic} from '@scure/bip39';
import {wordlist} from '@scure/bip39/wordlists/english';
import {createHash} from 'node:crypto';
import {verifyWatchOnlyGift} from './verify-watchonly-xpub-gift.mjs';

const hash160=b=>createHash('ripemd160').update(createHash('sha256').update(b).digest()).digest('hex');
function offlineRestore(phrase) {
  assert.ok(validateMnemonic(phrase,wordlist));
  const seed=mnemonicToSeedSync(phrase);
  const account=HDKey.fromMasterSeed(seed).derive("m/84'/0'/0'");
  seed.fill(0);
  return {accountXpub:account.publicExtendedKey,publicChild:i=>
    Buffer.from(account.deriveChild(1).deriveChild(i).publicKey)};
}
function script(height,pub) {
 const bytes=[];let v=height;
 do {bytes.push(v%256);v=Math.floor(v/256)} while(v);
 if(bytes.at(-1)&0x80)bytes.push(0);
 return Buffer.concat([Buffer.from([bytes.length,...bytes,0xb1,0x75,33]),pub,Buffer.from([0xac])]);
}
const mnemonic=entropyToMnemonic(Uint8Array.from({length:16},(_,i)=>i+9),wordlist);
const alternateMnemonic=entropyToMnemonic(Uint8Array.from({length:16},(_,i)=>i+21),wordlist);
assert.equal(mnemonic.split(' ').length,12);
const original=offlineRestore(mnemonic);
const replacement=offlineRestore(mnemonic); // Simulates clean signer restoration.
const incorrect=offlineRestore(alternateMnemonic);
assert.equal(original.accountXpub,replacement.accountXpub);
assert.notEqual(original.accountXpub,incorrect.accountXpub);
for(const count of [1,4,24]) {
 const descriptors=Array.from({length:count},(_,i)=>{
   const pub=original.publicChild(i);
   const locktime=500+i*144;
   const redeem=script(locktime,pub);
   return {index:i,path:"m/84'/0'/0'/1/"+i,vout:i+1,sats:12000+i*1000,
     publicKeyHex:pub.toString('hex'),locktime,redeemScriptHex:redeem.toString('hex'),
     scriptPubKey:'a914'+hash160(redeem)+'87'};
 });
 const tx={txid:'cb'.repeat(32),outputs:descriptors.map(d=>({vout:d.vout,sats:d.sats,scriptPubKey:d.scriptPubKey}))};
 const locator={fundingAddress:'3'+'A'.repeat(33)};
 const before=verifyWatchOnlyGift({locator,candidates:[tx],descriptors,accountXpub:original.accountXpub});
 const after=verifyWatchOnlyGift({locator,candidates:[tx],descriptors,accountXpub:replacement.accountXpub});
 const wrong=verifyWatchOnlyGift({locator,candidates:[tx],descriptors,accountXpub:incorrect.accountXpub});
 assert.equal(before.status,'watch-only-script-match');
 assert.equal(after.status,'watch-only-script-match');
 assert.equal(after.authenticated,false);
 assert.equal(wrong.status,'rejected');
 descriptors.forEach((d,i)=>assert.equal(replacement.publicChild(i).toString('hex'),d.publicKeyHex));
 console.log('PASS disposable 12-word restore yields same account xpub and',count,'CLTV public release keys; wrong wallet rejected');
}
assert.equal(original.accountXpub.startsWith('xpub'),true);
console.log('NO PRIVATE DATA IN OUTPUT. Hardware wallet restoration, first-date decryption, and gift-card link provenance are NOT proven.');
