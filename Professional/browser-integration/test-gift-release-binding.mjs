// Regtest selected-release binding tests. No keys, network or broadcast.
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {sha256} from '@noble/hashes/sha256';
import {verifyGiftReleaseBinding} from './verify-gift-release-binding.mjs';
import {readFileSync} from 'node:fs';
const entry=readFileSync('browser-verifier-entry.mjs','utf8');
const approved=entry.match(/const approved='([^']+)'/)?.[1];
assert.ok(approved,'Approved regtest PSBT fixture missing');
const psbt=bitcoin.Psbt.fromBase64(approved);
const tx=bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());
const digest=Buffer.from(sha256(Buffer.from(approved,'base64'))).toString('hex');
const gift={fundingAddress:'bc1q21publicgiftlocator12345678901234567890'};
const release={releaseNumber:1,fundingTxid:Buffer.from(tx.ins[0].hash).reverse().toString('hex'),
 fundingVout:tx.ins[0].index,lockHeight:tx.locktime,
 amountSats:tx.outs[0].value,destinationScriptHex:tx.outs[0].script.toString('hex')};
const verify=(r=release,g=gift,d=digest)=>verifyGiftReleaseBinding({
 gift:g,release:r,approvedUnsignedBase64:approved,expectedApprovedSha256:d});
assert.equal(verify().transactionMatchesSuppliedRelease,true);
assert.equal(verify().giftProvenanceVerified,false);
assert.equal(verify().fundingUtxoVerified,false);
assert.equal(verify().signingAuthorized,false);
for(const [field,value] of [['fundingTxid','00'.repeat(32)],['fundingVout',release.fundingVout+1],
 ['lockHeight',release.lockHeight+1],['amountSats',release.amountSats+1],
 ['destinationScriptHex','6a']]){
 assert.throws(()=>verify({...release,[field]:value}),/mismatch/,field+' must fail closed');
}
assert.throws(()=>verify(release,gift,'00'.repeat(32)),/digest mismatch/);
assert.throws(()=>verify(release,{fundingAddress:'invalid'}),/Invalid public gift locator/);
console.log('PASS: gift release binding checks funding outpoint, CLTV height, amount, destination and digest');
