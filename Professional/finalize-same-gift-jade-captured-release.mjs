// CLI adapter to the same Jade QR return used by Professional integration.
// No signing, no network, no broadcast.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {finalizeJadeSignedQrReturn} from './jade-signed-qr-return.mjs';
const [framesPath,handoffPath,rawPath]=process.argv.slice(2);
assert.ok(framesPath&&handoffPath&&rawPath,'Signed frames, handoff and output path required');
const handoff=JSON.parse(readFileSync(handoffPath,'utf8'));
const frames=readFileSync(framesPath,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(x=>/^ur:crypto-psbt\//i.test(x));
const result=finalizeJadeSignedQrReturn({handoff,frames});
writeFileSync(rawPath,result.rawTransactionHex+'\n',{flag:'wx',mode:0o600});
console.log('PASS_SAME_GIFT_SIGNED_RELEASE_FINALIZED',JSON.stringify({
 txid:result.txid,outpoint:handoff.fundingTxid+':'+handoff.vout,
 feeSats:handoff.feeSats,payoutSats:handoff.payoutSats,broadcast:false
}));
