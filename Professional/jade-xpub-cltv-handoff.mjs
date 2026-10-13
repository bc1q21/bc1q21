// Public-only BIP32 account xpub -> CLTV regtest handoff.
// Disposable Jade test account only; no private derivation, seed, network, or broadcast.
import { createHash, createHmac } from 'node:crypto';
import { secp256k1 } from '@noble/curves/secp256k1';
import bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'node:buffer';
import { verifyProfessionalPublicHandoff } from './public-handoff.mjs';

const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const sha=b=>createHash('sha256').update(b).digest();
const sha2=b=>sha(sha(b));
function decodeBase58Check(s){
 if(typeof s!=='string'||!/^xpub[1-9A-HJ-NP-Za-km-z]{100,120}$/.test(s))throw Error('Only public account xpub is accepted');
 let n=0n;for(const c of s){const i=alphabet.indexOf(c);if(i<0)throw Error('Invalid Base58');n=n*58n+BigInt(i);}
 let h=n.toString(16);if(h.length%2)h='0'+h;
 const leading=(s.match(/^1*/)||[''])[0].length;
 const data=Buffer.concat([Buffer.alloc(leading),Buffer.from(n?h:'','hex')]);
 if(data.length!==82||!sha2(data.subarray(0,78)).subarray(0,4).equals(data.subarray(78)))throw Error('Invalid xpub checksum or length');
 return data.subarray(0,78);
}
const uint32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;};
function child(node,index){
 const h=createHmac('sha512',node.chain).update(Buffer.concat([node.pub,uint32(index)])).digest();
 const k=BigInt('0x'+h.subarray(0,32).toString('hex'));
 if(k===0n||k>=secp256k1.CURVE.n)throw Error('Invalid child scalar');
 const point=secp256k1.ProjectivePoint.BASE.multiply(k).add(secp256k1.ProjectivePoint.fromHex(node.pub));
 if(point.equals(secp256k1.ProjectivePoint.ZERO))throw Error('Invalid child point');
 return {pub:Buffer.from(point.toRawBytes(true)),chain:h.subarray(32)};
}
export function deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex,locktime}){
 if(typeof masterFingerprintHex!=='string'||!/^[a-f0-9]{8}$/i.test(masterFingerprintHex))throw Error('Verified fingerprint required');
 if(!Number.isSafeInteger(childIndex)||childIndex<0||childIndex>100000)throw Error('Invalid child index');
 if(!Number.isSafeInteger(locktime)||locktime<17||locktime>=500000000)throw Error('Prototype locktime must be a block height >=17');
 const data=decodeBase58Check(accountXpub);
 if(data.readUInt32BE(0)!==0x0488b21e||data[4]!==3||data.readUInt32BE(9)!==0x80000000)
  throw Error('Expected mainnet account-level xpub, depth 3, account index 0');
 // xpub alone cannot attest purpose m/84'/0'/0', wallet identity, or fingerprint.
 const parentFingerprint=data.subarray(5,9).toString('hex');
 const account={chain:data.subarray(13,45),pub:data.subarray(45,78)};
 secp256k1.ProjectivePoint.fromHex(account.pub);
 const signer=child(child(account,1),childIndex);
 const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
  bitcoin.opcodes.OP_DROP,signer.pub,bitcoin.opcodes.OP_CHECKSIG]);
 const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
 const handoff={version:1,network:'regtest',signerPubkeyHex:signer.pub.toString('hex'),locktime,
  redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address};
 const verified=verifyProfessionalPublicHandoff(handoff);
 return Object.freeze({...verified,masterFingerprintHex:masterFingerprintHex.toLowerCase(),
  accountParentFingerprintHex:parentFingerprint,derivationPath:Object.freeze([0x80000054,0x80000000,0x80000000,1,childIndex]),
  source:'public-only xpub derivation',originAttestedByXpub:false});
}
