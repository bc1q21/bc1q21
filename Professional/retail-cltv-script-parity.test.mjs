import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {encodeRetailCltvScript,compareRetailCltvScriptWithProfessional} from './retail-cltv-script-parity.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
for(const locktime of [1926115200,2147483647,2147483648,2208988800]){
 test('retail CLTV script bytes equal Professional at '+locktime,()=>{
  const input={accountXpub,masterFingerprintHex:'e29ac13c',childIndex:0,locktime};
  const actual=deriveJadePublicCltvHandoff(input);
  assert.equal(encodeRetailCltvScript(locktime,actual.signerPubkeyHex),actual.redeemScriptHex);
  const result=compareRetailCltvScriptWithProfessional(input);
  assert.equal(result.sameScript,true);
  assert.equal(result.offlineSignerKeyOwnershipVerified,false);
 });
}
test('retail CLTV encoding rejects invalid pubkeys and locktimes',()=>{
 assert.throws(()=>encodeRetailCltvScript(1,'02'+'11'.repeat(32)),/Timestamp/);
 assert.throws(()=>encodeRetailCltvScript(2147483648,'04'+'11'.repeat(32)),/Compressed/);
});
