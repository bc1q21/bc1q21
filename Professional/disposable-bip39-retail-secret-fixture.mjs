// Disposable, OFFLINE-ONLY derivation fixture. This module accepts a fixed
// BIP39 test mnemonic and is not suitable for an online recipient application.
// Do not use with real wallet words, import into frontend, or expose the output.
import { pbkdf2Sync, createHmac, createHash } from 'node:crypto';
import { secp256k1 } from '@noble/curves/secp256k1';

const TEST_WORDS='abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const N=secp256k1.CURVE.n;
const HARD=0x80000000;
function indexBytes(i){const b=Buffer.alloc(4);b.writeUInt32BE(i);return b;}
function child({key,chain},i){
 const data=i>=HARD?Buffer.concat([Buffer.from([0]),key,indexBytes(i)]):
  Buffer.concat([Buffer.from(secp256k1.getPublicKey(key,true)),indexBytes(i)]);
 const digest=createHmac('sha512',chain).update(data).digest();
 const tweak=BigInt('0x'+digest.subarray(0,32).toString('hex'));
 const old=BigInt('0x'+key.toString('hex'));
 if(tweak>=N)throw Error('Invalid BIP32 derivation');
 const value=(tweak+old)%N;
 if(value===0n)throw Error('Invalid BIP32 derivation');
 key.fill(0);
 return {key:Buffer.from(value.toString(16).padStart(64,'0'),'hex'),chain:Buffer.from(digest.subarray(32))};
}
export function deriveDisposableRetailEncryptionPassphraseOffline(){
 const seed=pbkdf2Sync(TEST_WORDS,'mnemonic',2048,64,'sha512');
 const digest=createHmac('sha512','Bitcoin seed').update(seed).digest();
 seed.fill(0);
 let node={key:Buffer.from(digest.subarray(0,32)),chain:Buffer.from(digest.subarray(32))};
 for(const index of [84+HARD,HARD,HARD,0,2])node=child(node,index);
 const passphrase=createHash('sha256').update(Buffer.concat([
  node.key,Buffer.from('bc1q21-opreturn-encryption-v1','utf8')])).digest('hex');
 node.key.fill(0);
 return passphrase; // test-only output; NEVER export a real wallet's equivalent
}
