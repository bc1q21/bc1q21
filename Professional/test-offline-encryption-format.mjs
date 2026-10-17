// bc1q21 Professional disposable format-compatibility test; NO wallet secret or hardware key.
import assert from 'node:assert/strict';
import {createHash,randomBytes,webcrypto} from 'node:crypto';
const te=new TextEncoder(),td=new TextDecoder();
const subtle=webcrypto.subtle;
const header=te.encode('BC1Q21G1');
const salt=randomBytes(16),iv=randomBytes(12);
// Unambiguously synthetic bytes. NEVER a real BIP32 child key, seed, mnemonic, or xprv.
const syntheticChild=Buffer.from('Professional offline encryption compatibility test only; not a BIP32 secret');
const label=te.encode('bc1q21-opreturn-encryption-v1');
const secret=createHash('sha256').update(syntheticChild).update(label).digest('hex');
async function key(pass){
  const k=await subtle.importKey('raw',te.encode(pass),'PBKDF2',false,['deriveKey']);
  return subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},
    k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const plaintext='323033302d30312d3031'; // hex of fictional first release date: 2030-01-01
const k=await key(secret);
const ct=Buffer.from(await subtle.encrypt({name:'AES-GCM',iv,additionalData:header,tagLength:128},k,te.encode(plaintext)));
const output=Buffer.concat([header,salt,iv,ct]);
assert.equal(output.subarray(0,8).toString(),'BC1Q21G1');
assert.equal(output.subarray(8,24).length,16);
assert.equal(output.subarray(24,36).length,12);
assert.equal(td.decode(await subtle.decrypt({name:'AES-GCM',iv,additionalData:header,tagLength:128},k,ct)),plaintext);
let failed=false;
try{
  const bad=await key('incorrect synthetic test secret');
  await subtle.decrypt({name:'AES-GCM',iv,additionalData:header,tagLength:128},bad,ct);
}catch{failed=true;}
assert.ok(failed,'Wrong-key decrypt must fail');
const tampered=Buffer.from(ct);tampered[0]^=1;
failed=false;
try{await subtle.decrypt({name:'AES-GCM',iv,additionalData:header,tagLength:128},k,tampered);}
catch{failed=true;}
assert.ok(failed,'Tampered ciphertext must fail');
console.log('PASS synthetic BC1Q21G1 encryption/decryption, wrong-key rejection, tamper rejection');
console.log('BOUNDARY NOT TESTED: Jade offline derivation of retail /0/2 private child; recovery from Jade alone');
console.log('No secret, plaintext, test key, encrypted blob, or private material output');
