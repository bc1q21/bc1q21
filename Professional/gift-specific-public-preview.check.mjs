import assert from 'node:assert/strict';
import {inspectGiftSpecificPreview} from './gift-specific-public-preview.mjs';

const address='3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
const txid='a'.repeat(64);
const output={n:0,scriptpubkey_type:'p2sh',scriptpubkey:'a914'+'b'.repeat(40)+'87',scriptpubkey_address:address,value:12000};
const tx={txid,vout:[{n:1,scriptpubkey_type:'op_return'},output]};
const url='https://example.invalid/gift/'+address;
const preview=inspectGiftSpecificPreview(url,[tx]);
assert.equal(preview.state,'preview-only');
assert.equal(preview.releaseCount,1);
assert.equal(preview.totalSats,12000);
for(const k of ['authenticated','scheduleUnlocked','canConstructRelease','canSign','canBroadcast']) assert.equal(preview[k],false);
assert.equal(JSON.stringify(preview).includes('locktime'),false);
assert.equal(inspectGiftSpecificPreview(url,[tx,tx]).state,'ambiguous');
assert.equal(inspectGiftSpecificPreview(url,[]).state,'not-found');
assert.throws(()=>inspectGiftSpecificPreview(url+'?seed=bad',[tx]));
console.log('PASS — gift-specific public preview is non-authorizing and fail-closed');
