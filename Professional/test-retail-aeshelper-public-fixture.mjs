// Isolated compatibility check against the ACTUAL retail AESHelper module.
// All inputs are fabricated strings; there is no wallet/seed/private key here.
import assert from 'node:assert/strict';
import {createDecipheriv,pbkdf2Sync} from 'node:crypto';
import {encryptShortHex,decryptShortHex} from '../Frontend/AESHelper.js';
const header=Buffer.from('BC1Q21G1');
const pretendSecret='PUBLIC-ONLY-SYNTHETIC-TEST-NOT-WALLET-MATERIAL';
const alternate='ANOTHER-PUBLIC-SYNTHETIC-TEST-NOT-WALLET-MATERIAL';
function independentDecrypt(hex,passphrase) {
 const blob=Buffer.from(hex,'hex');
 assert.ok(blob.length>=52);
 assert.deepEqual(blob.subarray(0,8),header);
 const key=pbkdf2Sync(passphrase,blob.subarray(8,24),100000,32,'sha256');
 try {
  const dec=createDecipheriv('aes-256-gcm',key,blob.subarray(24,36));
  dec.setAAD(header);
  dec.setAuthTag(blob.subarray(-16));
  return Buffer.concat([dec.update(blob.subarray(36,-16)),dec.final()]).toString('utf8');
 } finally {key.fill(0);}
}
for(const iso of ['2030-01-01','2041-12-31','2100-06-15']){
 const expected=Buffer.from(iso).toString('hex');
 const blob=await encryptShortHex(expected,pretendSecret);
 assert.equal(await decryptShortHex(blob,'legacy not used',pretendSecret),expected);
 assert.equal(independentDecrypt(blob,pretendSecret),expected);
 assert.equal(Buffer.from(independentDecrypt(blob,pretendSecret),'hex').toString(),iso);
 await assert.rejects(decryptShortHex(blob,'legacy not used',alternate));
 assert.throws(()=>independentDecrypt(blob,alternate));
 const modified=Buffer.from(blob,'hex');modified[modified.length-1]^=1;
 await assert.rejects(decryptShortHex(modified.toString('hex'),'legacy not used',pretendSecret));
 console.log('PASS actual retail AESHelper BC1Q21G1 format, first-date encoding, negative authentication cases');
}
console.log('NO wallet recovery words, HD child keys, private keys or derived wallet secrets used');
console.log('UNPROVEN Jade recovery of wallet-derived retail first-date decryption secret');
