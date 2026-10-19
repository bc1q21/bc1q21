import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {bindOneGiftToRawFundingTransaction} from './one-gift-raw-funding-binding.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const firstDate='2031-01-15';
const h=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex:0,locktime:retailDateToCltvTimestamp(firstDate)});
const published={accountXpub,masterFingerprintHex,firstDate,interval:'month',outputScriptsHex:[h.fundingScriptPubKeyHex]};
const fundingAddress='bcrt1q'+'q'.repeat(38);
const giftUrl='https://example.invalid/gift/'+fundingAddress+'?interval=month';
const commitment={fundingAddress,releaseScriptsHex:published.outputScriptsHex};
function rawFunding(script=h.fundingScriptPubKeyHex,amount=120000) {
 const tx=new bitcoin.Transaction();tx.version=2;
 tx.addInput(Buffer.alloc(32,1),0,0xfffffffe);
 tx.addOutput(Buffer.from(script,'hex'),amount);
 return tx.toHex();
}
test('one serialized transaction binds exact release script and output value, without authorization',()=>{
 const raw=rawFunding();
 const result=bindOneGiftToRawFundingTransaction(giftUrl,published,commitment,raw);
 assert.equal(result.fundingTxid,bitcoin.Transaction.fromHex(raw).getId());
 assert.deepEqual(result.releaseOutputs,[{index:0,vout:0,sats:120000,scriptPubKeyHex:h.fundingScriptPubKeyHex}]);
 assert.equal(result.evidenceLevel,'raw-transaction-script-match-only');
 for(const field of ['chainVerified','confirmed','unspentVerified','creatorAuthenticated','recipientAuthenticated','readyForLiveRouting','canSign','canBroadcast'])
  assert.equal(result[field],false);
});
test('reject changed transaction output, duplicate script and invalid input',()=>{
 assert.throws(()=>bindOneGiftToRawFundingTransaction(giftUrl,published,commitment,rawFunding('a914'+'00'.repeat(20)+'87')),/exactly one/);
 const tx=bitcoin.Transaction.fromHex(rawFunding());
 tx.addOutput(Buffer.from(h.fundingScriptPubKeyHex,'hex'),5000);
 assert.throws(()=>bindOneGiftToRawFundingTransaction(giftUrl,published,commitment,tx.toHex()),/exactly one/);
 assert.throws(()=>bindOneGiftToRawFundingTransaction(giftUrl,published,commitment,'not hex'),/Malformed/);
 assert.throws(()=>bindOneGiftToRawFundingTransaction(giftUrl,published,{...commitment,fundingAddress:h.fundingAddress},rawFunding()),/disagree/);
});
