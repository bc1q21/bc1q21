import assert from 'node:assert/strict';
import {inspectRecipientReleaseBoundary} from './gift-specific-release-boundary.mjs';
const a='3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
const tx={txid:'a'.repeat(64),vout:[
  {n:0,scriptpubkey_type:'op_return'},
  {n:1,scriptpubkey_type:'p2sh',scriptpubkey:'a914'+'b'.repeat(40)+'87',scriptpubkey_address:a,value:12000}
]};
for(const candidates of [[],[tx],[tx,tx]]) {
 const result=inspectRecipientReleaseBoundary('https://example.invalid/gift/'+a,candidates);
 assert.equal(result.permitted,false);
 assert.equal(result.unsignedPsbt,null);
 assert.equal(result.signedPsbt,null);
 assert.equal(result.preview.scheduleUnlocked,false);
 assert.equal(result.preview.canSign,false);
 assert.equal(result.requiredEvidence.length,6);
}
console.log('PASS — public gift candidates cannot construct or authorize release PSBT');
