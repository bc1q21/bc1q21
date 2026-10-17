// bc1q21 Professional recovery handoff boundary. Synthetic-only software contract.
// The trusted OFFLINE component receives the ciphertext and a synthetic non-wallet
// password locally; the recipient page receives ONLY validated first-date metadata.
// Does not use Jade or claim that Jade can decrypt arbitrary AES.
import assert from 'node:assert/strict';
import {encryptShortHex,decryptShortHex} from '../Frontend/AESHelper.js';

const DATE=/^\d{4}-\d{2}-\d{2}$/;
function validDate(s){
  assert.ok(DATE.test(s),'Invalid first release date');
  assert.equal(new Date(s+'T00:00:00Z').toISOString().slice(0,10),s,'Invalid calendar date');
  assert.ok(s>='2009-01-03'&&s<='2105-12-31','Release date out of supported range');
  return s;
}
export function validateRecoveryHandoff(message,expectedChallenge){
  assert.ok(message&&typeof message==='object'&&!Array.isArray(message));
  assert.deepEqual(Object.keys(message).sort(),
   ['challenge','firstReleaseDate','format','giftCommitment','network','result'].sort(),
   'Unexpected information crossing offline boundary');
  assert.equal(message.format,'bc1q21-professional-offline-date-handoff-v1');
  assert.equal(message.network,'regtest');
  assert.equal(message.result,'first-date-only');
  assert.match(message.challenge,/^[a-f0-9]{32}$/);
  assert.equal(message.challenge,expectedChallenge,'Challenge mismatch');
  assert.match(message.giftCommitment,/^[a-f0-9]{64}$/);
  validDate(message.firstReleaseDate);
  return Object.freeze({ ...message });
}
// Test harness for an OFFLINE COMPONENT only. NOT browser-deployable wallet code.
// In production the device must decrypt internally and never export the password.
export async function syntheticOfflineDecrypt({cipherHex,password,challenge,giftCommitment}){
  assert.match(challenge,/^[a-f0-9]{32}$/);
  assert.match(giftCommitment,/^[a-f0-9]{64}$/);
  const recovered=await decryptShortHex(cipherHex,'NOT-A-LEGACY-PASSWORD',password);
  assert.match(recovered,/^(?:[0-9a-f]{2})+$/);
  const firstReleaseDate=validDate(Buffer.from(recovered,'hex').toString('utf8'));
  return validateRecoveryHandoff({
   format:'bc1q21-professional-offline-date-handoff-v1',
   network:'regtest',result:'first-date-only',
   challenge,giftCommitment,firstReleaseDate
  },challenge);
}
export async function syntheticFixtureCipher(date,password){
 return encryptShortHex(Buffer.from(validDate(date),'utf8').toString('hex'),password);
}
