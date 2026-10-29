// bc1q21 Professional — public-only BIP32 release-key derivation.
// Derives m/84'/0'/0'/1/i from a supplied account xpub (non-hardened steps).
// This verifies mathematical consistency, NOT that Jade owns the xpub or that
// the intended beneficiary has accepted/recovered the wallet.
import {sha256} from '@noble/hashes/sha256';
import {sha512} from '@noble/hashes/sha512';
import {hmac} from '@noble/hashes/hmac';
import {secp256k1} from '@noble/curves/secp256k1';
const fail=m=>{throw Error('Professional recipient public derivation: '+m)};
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function decodeXpub(s){
 if(typeof s!=='string'||s.length<105||s.length>120)fail('Account xpub required');
 let n=0n;
 for(const c of s){const d=alphabet.indexOf(c);if(d<0)fail('Invalid base58 character');n=n*58n+BigInt(d)}
 let hex=n.toString(16);if(hex.length%2)hex='0'+hex;
 const zeros=(s.match(/^1*/)||[''])[0].length;
 const raw=Buffer.concat([Buffer.alloc(zeros),Buffer.from(hex,'hex')]);
 if(raw.length!==82)fail('Invalid xpub length');
 const checksum=Buffer.from(sha256(sha256(raw.subarray(0,78)))).subarray(0,4);
 if(!checksum.equals(raw.subarray(78)))fail('Invalid xpub checksum');
 if(raw.readUInt32BE(0)!==0x0488b21e||raw[4]!==3||
    raw.readUInt32BE(9)!==0x80000000)fail('Expected depth-three account xpub for account zero');
 const pub=raw.subarray(45,78);
 try{secp256k1.ProjectivePoint.fromHex(pub)}catch{fail('Invalid account public key')}
 return {pub,chain:raw.subarray(13,45)};
}
function derive(node,index){
 if(!Number.isSafeInteger(index)||index<0||index>=0x80000000)fail('Invalid child index');
 const suffix=Buffer.alloc(4);suffix.writeUInt32BE(index);
 const bytes=Buffer.from(hmac(sha512,node.chain,Buffer.concat([node.pub,suffix])));
 const scalar=BigInt('0x'+bytes.subarray(0,32).toString('hex'));
 if(scalar===0n||scalar>=secp256k1.CURVE.n)fail('Invalid child scalar');
 const point=secp256k1.ProjectivePoint.BASE.multiply(scalar)
   .add(secp256k1.ProjectivePoint.fromHex(node.pub));
 if(point.equals(secp256k1.ProjectivePoint.ZERO))fail('Invalid child public key');
 return {pub:Buffer.from(point.toRawBytes(true)),chain:bytes.subarray(32)};
}
export function deriveRecipientReleaseKeysFromXpub({accountXpub,releaseCount}){
 if(!Number.isSafeInteger(releaseCount)||releaseCount<1||releaseCount>60)
   fail('Invalid release count');
 const branch=derive(decodeXpub(accountXpub),1);
 const keys=Array.from({length:releaseCount},(_,i)=>Object.freeze({
   index:i,path:`m/84'/0'/0'/1/${i}`,
   publicKeyHex:derive(branch,i).pub.toString('hex')
 }));
 return Object.freeze({
  format:'bc1q21-professional-recipient-public-derivation-v1',
  network:'regtest',keys:Object.freeze(keys),
  keysMathematicallyDerived:true,
  accountXpubOriginAuthenticated:false,
  beneficiaryWalletRecoveryVerified:false,
  signingAuthorized:false,broadcastAuthorized:false
 });
}
