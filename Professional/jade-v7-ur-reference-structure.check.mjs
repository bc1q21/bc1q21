// Structural regression for previously captured PUBLIC Jade V7 QR reference.
// Does NOT decode Bytewords/CBOR/UR fountain, nor establish Jade compatibility
// for the newly funded 313-byte PSBT. Hardware OFF, no signing/network.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
const ref=JSON.parse(readFileSync(new URL('./jade-v7-ur-reference-frames.json',import.meta.url),'utf8'));
assert.equal(ref.frames.length,7);
const seen=new Set();
for(let i=0;i<ref.frames.length;i++){
 const f=ref.frames[i];
 assert.equal(f.length,[135,135,135,135,135,135,135][i],'V7 recorded UR frame length changed');
 const match=f.match(/^ur:crypto-psbt\/([1-7])-7\/([a-z]+)$/);
 assert.ok(match,'Invalid reference UR structure');
 assert.equal(Number(match[1]),i+1);
 assert.ok(!seen.has(f),'Duplicate reference frame');
 seen.add(f);
}
const source=readFileSync(new URL('./jade-v7-captured-signed-cltv.check.mjs',import.meta.url),'utf8');
const match=source.match(/const signed = Buffer\.from\('([A-Za-z0-9+/=]+)', 'base64'\)/);
assert.ok(match,'Missing recorded synthetic Jade signed PSBT');
const signed=bitcoin.Psbt.fromBase64(match[1]);
delete signed.data.inputs[0].partialSig;
const raw=signed.toBuffer();
assert.equal(raw.length,283);
assert.equal(createHash('sha256').update(raw).digest('hex'),ref.syntheticUnsignedPsbtSha256);
console.log('PASS_JADE_V7_UR_REFERENCE_STRUCTURE',JSON.stringify({
 frameCount:7,recordedFrameLengths:[135,135,135,135,135,135,135],urType:'crypto-psbt',
 recordedSyntheticPsbtBytes:283,syntheticSha256:ref.syntheticUnsignedPsbtSha256,
 urPayloadDecoded:false,hardwareCompatibilityForFundedRegtestVerified:false,signed:false,broadcast:false
}));
