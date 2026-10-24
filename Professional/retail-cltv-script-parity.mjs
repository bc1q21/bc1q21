// Byte-level comparison helper for retail's CLTV script layout.
// This is a public-only, regtest research helper; no mnemonic or signing.
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';

export function encodeRetailCltvScript(locktime,pubkeyHex) {
 assert.ok(Number.isSafeInteger(locktime)&&locktime>=500000000&&locktime<=0xffffffff,'Timestamp CLTV required');
 assert.match(pubkeyHex??'',/^(02|03)[a-f0-9]{64}$/,'Compressed public key required');
 const number=[];
 let n=locktime;
 while(n>0){number.push(n%256);n=Math.floor(n/256);}
 if(number.length===0)number.push(0);
 if(number.at(-1)&0x80)number.push(0);
 return Buffer.from([number.length,...number,0xb1,0x75,33,...Buffer.from(pubkeyHex,'hex'),0xac]).toString('hex');
}
export function compareRetailCltvScriptWithProfessional(input) {
 const derived=deriveJadePublicCltvHandoff(input);
 const retail=encodeRetailCltvScript(input.locktime,derived.signerPubkeyHex);
 assert.equal(derived.redeemScriptHex,retail,'Professional CLTV script differs from retail byte layout');
 return Object.freeze({sameScript:true,redeemScriptHex:retail,derivationPath:derived.derivationPath,
  offlineSignerKeyOwnershipVerified:false,canSign:false,canBroadcast:false});
}
