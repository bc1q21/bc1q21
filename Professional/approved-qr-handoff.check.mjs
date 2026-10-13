import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import bitcoin from 'bitcoinjs-lib';
import { makeApprovedCryptoPsbtQrFrames } from './approved-qr-handoff.mjs';
const tx=new bitcoin.Transaction();tx.addInput(Buffer.alloc(32,1),0);tx.addOutput(Buffer.from('0014'+'aa'.repeat(20),'hex'),100000);
const psbt=new bitcoin.Psbt({network:bitcoin.networks.regtest});
psbt.addInput({hash:tx.getId(),index:0,sequence:0xfffffffe,nonWitnessUtxo:tx.toBuffer()});
psbt.addOutput({script:Buffer.from('0014'+'bb'.repeat(20),'hex'),value:99000});
const b64=psbt.toBase64(),digest=createHash('sha256').update(Buffer.from(b64,'base64')).digest('hex');
const handoff={network:'regtest',unsignedPsbtBase64:b64,psbtSha256:digest,approvalVerified:true,signed:false,broadcast:false,nextEncoder:'ur:crypto-psbt'};
const result=makeApprovedCryptoPsbtQrFrames(handoff,{fragmentLength:120,frameCount:64});
assert.equal(result.verifiedRoundTrip,true);
assert.equal(result.psbtSha256,digest);
assert.ok(result.frames.length===64&&result.frames.every(f=>f.startsWith('ur:crypto-psbt/')));
for(const altered of [
 {...handoff,psbtSha256:'00'.repeat(32)},
 {...handoff,network:'bitcoin'},
 {...handoff,approvalVerified:false},
 {...handoff,signed:true},
 {...handoff,broadcast:true},
 {...handoff,nextEncoder:'qr:other'}
])assert.throws(()=>makeApprovedCryptoPsbtQrFrames(altered),/Professional approved QR/);
console.log('PASS: approved regtest PSBT survives crypto-psbt QR encoding and independent decode byte-for-byte; altered handoff rejected');
