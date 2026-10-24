import test from 'node:test';
import assert from 'node:assert/strict';
import {HDKey} from '@scure/bip32';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {encodeRetailCltvScript} from './retail-cltv-script-parity.mjs';
import {createHash} from 'node:crypto';

const xpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const account=HDKey.fromExtendedKey(xpub);
const hash160=b=>createHash('ripemd160').update(createHash('sha256').update(b).digest()).digest('hex');

test('24 public Jade-derived CLTV outputs match retail scripts independently',()=>{
 assert.equal(account.privateKey,null);
 const seen=new Set();
 for(let index=0;index<24;index++){
  const locktime=Math.floor(Date.UTC(2027+index,0,1)/1000);
  const key=account.deriveChild(1).deriveChild(index);
  const pubkey=Buffer.from(key.publicKey).toString('hex');
  const retailScript=encodeRetailCltvScript(locktime,pubkey);
  const pro=deriveJadePublicCltvHandoff({accountXpub:xpub,masterFingerprintHex:'e29ac13c',childIndex:index,locktime});
  assert.equal(pro.signerPubkeyHex,pubkey);
  assert.equal(pro.redeemScriptHex,retailScript);
  const scriptPubKey='a914'+hash160(Buffer.from(retailScript,'hex'))+'87';
  assert.equal(pro.fundingScriptPubKeyHex,scriptPubKey);
  assert.ok(!seen.has(scriptPubKey),'Each output must have its own script');
  seen.add(scriptPubKey);
 }
 assert.equal(seen.size,24);
});
