// Regtest selected-release binding tests. No keys, network or broadcast.
import assert from 'node:assert/strict';
import {selectPublicGiftRelease} from './select-public-gift-release.mjs';
import bitcoin from 'bitcoinjs-lib';
import {sha256} from '@noble/hashes/sha256';
import {verifyGiftReleaseBinding,checkGiftReleaseAgainstUtxoSnapshot} from './verify-gift-release-binding.mjs';
import {readFileSync} from 'node:fs';
const entry=readFileSync('browser-verifier-entry.mjs','utf8');
const approved=entry.match(/const approved='([^']+)'/)?.[1];
assert.ok(approved,'Approved regtest PSBT fixture missing');
const psbt=bitcoin.Psbt.fromBase64(approved);
const tx=bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());
const digest=Buffer.from(sha256(Buffer.from(approved,'base64'))).toString('hex');
const prev=bitcoin.Transaction.fromBuffer(psbt.data.inputs[0].nonWitnessUtxo);
const gift={fundingAddress:'bc1q21publicgiftlocator12345678901234567890'};
const release={releaseNumber:1,fundingTxid:Buffer.from(tx.ins[0].hash).reverse().toString('hex'),
 fundingVout:tx.ins[0].index,lockHeight:tx.locktime,
 amountSats:tx.outs[0].value,destinationScriptHex:tx.outs[0].script.toString('hex'),
 fundingScriptHex:prev.outs[tx.ins[0].index].script.toString('hex'),
 inputSats:prev.outs[tx.ins[0].index].value};
const verify=(r=release,g=gift,d=digest)=>verifyGiftReleaseBinding({
 gift:g,release:r,approvedUnsignedBase64:approved,expectedApprovedSha256:d});
assert.equal(verify().transactionMatchesSuppliedRelease,true);
assert.equal(verify().giftProvenanceVerified,false);
assert.equal(verify().fundingUtxoVerified,false);
assert.equal(verify().signingAuthorized,false);
for(const [field,value] of [['fundingTxid','00'.repeat(32)],['fundingVout',release.fundingVout+1],
 ['lockHeight',release.lockHeight+1],['amountSats',release.amountSats+1],
 ['destinationScriptHex','6a'],['fundingScriptHex','6a'],['inputSats',release.inputSats+1]]){
 assert.throws(()=>verify({...release,[field]:value}),/mismatch/,field+' must fail closed');
}
assert.throws(()=>verify(release,gift,'00'.repeat(32)),/digest mismatch/);
assert.throws(()=>verify(release,{fundingAddress:'invalid'}),/Invalid public gift locator/);
const snapshot={txid:release.fundingTxid,vout:release.fundingVout,
 confirmed:true,spent:false,valueSats:release.inputSats,
 scriptPubKeyHex:release.fundingScriptHex};
const snapshotGate=(utxo=snapshot,binding=verify())=>checkGiftReleaseAgainstUtxoSnapshot({binding,release,snapshot:utxo});
assert.equal(snapshotGate().utxoSnapshotMatchesSelectedRelease,true);
assert.equal(snapshotGate().chainVerified,false);
assert.equal(snapshotGate().signingAuthorized,false);
for(const [field,value] of [['txid','00'.repeat(32)],['vout',release.fundingVout+1],
 ['confirmed',false],['spent',true],['valueSats',release.inputSats+1],
 ['scriptPubKeyHex','6a']]){
 assert.throws(()=>snapshotGate({...snapshot,[field]:value}),/mismatch|unconfirmed|spent|unknown/,field+' must fail closed');
}
assert.throws(()=>snapshotGate(snapshot,{transactionMatchesSuppliedRelease:false}),/must match approved PSBT/);
console.log('PASS: gift release binding checks funding outpoint, CLTV height, amount, destination and digest');

const publicGift={fundingAddress:gift.fundingAddress,releases:[{...release,releaseNumber:1}]};
const selected=selectPublicGiftRelease({gift:publicGift,recipientLocator:gift.fundingAddress,releaseNumber:1});
assert.equal(selected.fundingTxid,release.fundingTxid);
assert.equal(selected.fundingVout,release.fundingVout);
assert.equal(selected.signingAuthorized,false);
assert.throws(()=>selectPublicGiftRelease({gift:publicGift,recipientLocator:'wrong',releaseNumber:1}),/link does not match/);
assert.throws(()=>selectPublicGiftRelease({gift:publicGift,recipientLocator:gift.fundingAddress,releaseNumber:2}),/absent/);
assert.throws(()=>selectPublicGiftRelease({gift:{...publicGift,releases:[release,release]},recipientLocator:gift.fundingAddress,releaseNumber:1}),/Duplicate/);

// Multiple releases: selection must never silently substitute another outpoint.
const second={...release,releaseNumber:2,fundingVout:release.fundingVout+1};
const twoReleaseGift={fundingAddress:gift.fundingAddress,releases:[release,second]};
assert.equal(selectPublicGiftRelease({gift:twoReleaseGift,recipientLocator:gift.fundingAddress,releaseNumber:2}).fundingVout,second.fundingVout);
assert.throws(()=>selectPublicGiftRelease({gift:{...twoReleaseGift,releases:[release,{...second,fundingTxid:'bad'}]},recipientLocator:gift.fundingAddress,releaseNumber:1}),/Invalid release funding evidence/);
assert.throws(()=>selectPublicGiftRelease({gift:{...twoReleaseGift,releases:[release,{...second,releaseNumber:1}]},recipientLocator:gift.fundingAddress,releaseNumber:1}),/Duplicate/);
assert.throws(()=>selectPublicGiftRelease({gift:twoReleaseGift,recipientLocator:gift.fundingAddress,releaseNumber:0}),/Invalid release selection/);
