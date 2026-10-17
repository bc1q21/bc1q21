import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HDKey} from '@scure/bip32';
import {verifyWatchOnlyGift} from './verify-watchonly-xpub-gift.mjs';
const h160=b=>createHash('ripemd160').update(createHash('sha256').update(b).digest()).digest('hex');
// Clearly disposable synthetic test input, NEVER a real wallet seed.
// Used only in this temporary test process to manufacture a PUBLIC xpub fixture.
const account=HDKey.fromMasterSeed(Buffer.alloc(32,7)).derive("m/84'/0'/0'");
const other=HDKey.fromMasterSeed(Buffer.alloc(32,8)).derive("m/84'/0'/0'");
const publicAccount=account.publicExtendedKey,otherPublic=other.publicExtendedKey;
const loc={fundingAddress:'3'+'A'.repeat(33)};
function fixture(count){
 const descriptors=Array.from({length:count},(_,index)=>{
  const pub=Buffer.from(account.deriveChild(1).deriveChild(index).publicKey);
  const locktime=130+index*10;
  // Minimal positive script number: sign extension only when required.
  const num=locktime<=127?Buffer.from([locktime]):
    locktime<=255?Buffer.from([locktime,0]):
    Buffer.from([locktime&255,locktime>>8]);
  const script=Buffer.concat([Buffer.from([num.length]),num,Buffer.from('b17521','hex'),pub,Buffer.from([0xac])]);
  return {index,path:"m/84'/0'/0'/1/"+index,vout:index+1,sats:12000+index*1000,
    publicKeyHex:pub.toString('hex'),locktime,redeemScriptHex:script.toString('hex'),
    scriptPubKey:'a914'+h160(script)+'87'};
 });
 return {descriptors,tx:{txid:'ba'.repeat(32),
   outputs:descriptors.map(x=>({vout:x.vout,sats:x.sats,scriptPubKey:x.scriptPubKey}))}};
}
for(const n of [1,4,24]){
 const {descriptors,tx}=fixture(n);
 const verify=(xs=descriptors,t=tx,xpub=publicAccount)=>
   verifyWatchOnlyGift({locator:loc,candidates:[t],descriptors:xs,accountXpub:xpub});
 const ok=verify();
 assert.equal(ok.status,'watch-only-script-match',ok.reason);
 assert.equal(ok.authenticated,false);
 assert.equal(ok.matches.length,n);
 assert.equal(verify(descriptors,tx,otherPublic).status,'rejected');
 assert.equal(verify(descriptors,tx,'xprv_bad').status,'rejected');
 const forged=structuredClone(descriptors);forged[0].publicKeyHex='02'+'22'.repeat(32);
 assert.equal(verify(forged).status,'rejected');
 const wrongPath=structuredClone(descriptors);wrongPath[0].path="m/84'/0'/0'/2/0";
 assert.equal(verify(wrongPath).status,'rejected');
 const otherScript=structuredClone(descriptors);otherScript[0].locktime++;
 assert.equal(verify(otherScript).status,'rejected');
 const wrongTx=structuredClone(tx);wrongTx.outputs[0].sats++;
 assert.equal(verify(descriptors,wrongTx).status,'rejected');
 const ambiguous=verifyWatchOnlyGift({locator:loc,candidates:[tx,tx],descriptors,accountXpub:publicAccount});
 assert.equal(ambiguous.status,'rejected');
 console.log('PASS deterministic PUBLIC xpub child derivation and CLTV script binding:',n,'releases');
}
console.log('SECURITY BOUNDARY: public xpub/script matching alone does not authenticate gift-card link, wallet custody or decrypt OP_RETURN.');
