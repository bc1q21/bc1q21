// Fail-closed tests for the new Option B funded-link boundary.
// No Bitcoin Core, hardware wallet, mainnet, or signing involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {digestProfessionalGiftBinding} from './public-gift-binding-commitment.mjs';
import {prepareOptionBFundedLinkReview} from './option-b-funded-link-review.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const dates=['2031-01-15','2031-02-15'];
const handoffs=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}));
const fundingAddress='bcrt1q'+'q'.repeat(38);
const giftUrl='https://example.invalid/gift/'+fundingAddress+'?interval=month';
const published={accountXpub,masterFingerprintHex,firstDate:dates[0],
 interval:'month',outputScriptsHex:handoffs.map(h=>h.fundingScriptPubKeyHex)};
const locatorMapping={fundingAddress,releaseScriptsHex:[...published.outputScriptsHex]};
const binding={network:'regtest',fundingTxid:'a'.repeat(64),
 releaseOutputs:handoffs.map((h,index)=>({index,vout:index+1,sats:10000,
  scriptPubKeyHex:h.fundingScriptPubKeyHex}))};
const expectedBindingDigest=digestProfessionalGiftBinding(binding);
const base={giftUrl,published,locatorMapping,binding,expectedBindingDigest,
 releaseIndex:0,publicHandoff:handoffs[0],
 // Intentionally no RPC credentials: negative tests must fail BEFORE RPC.
 authorization:undefined,port:undefined,funding:{},approvedIntent:{}};
async function rejects(patch,pattern) {
 await assert.rejects(prepareOptionBFundedLinkReview({...base,...patch}),pattern);
}
test('rejects gift-link interval altered from published interval before RPC',async()=>{
 await rejects({giftUrl:giftUrl.replace('month','year')},/interval differs/);
});
test('rejects gift locator mismatch before RPC',async()=>{
 await rejects({locatorMapping:{...locatorMapping,fundingAddress:handoffs[0].fundingAddress}},/disagree/);
});
test('rejects shifted public date before RPC',async()=>{
 await rejects({published:{...published,firstDate:'2031-01-16'}},/does not match/);
});
test('rejects release count mismatch before RPC',async()=>{
 await rejects({binding:{...binding,releaseOutputs:binding.releaseOutputs.slice(0,1)}},/release count/);
});
test('rejects changed release script before RPC',async()=>{
 const altered={...binding,releaseOutputs:binding.releaseOutputs.map((x,i)=>
  i===1?{...x,scriptPubKeyHex:'a914'+'00'.repeat(20)+'87'}:x)};
 await rejects({binding:altered},/Funded script differs/);
});
test('rejects changed satoshis against recipient commitment before RPC',async()=>{
 const altered={...binding,releaseOutputs:binding.releaseOutputs.map((x,i)=>
  i===0?{...x,sats:x.sats+1}:x)};
 await rejects({binding:altered},/independently held commitment/);
});
test('rejects changed funding transaction against recipient commitment before RPC',async()=>{
 await rejects({binding:{...binding,fundingTxid:'b'.repeat(64)}},/independently held commitment/);
});
test('rejects wrong signer handoff before RPC',async()=>{
 await rejects({publicHandoff:handoffs[1]},/Selected signer handoff differs/);
});
test('rejects out-of-range selected release before RPC',async()=>{
 await rejects({releaseIndex:2},/Invalid selected release index/);
});
test('rejects absent independent recipient commitment before RPC',async()=>{
 await rejects({expectedBindingDigest:undefined},/Independent gift commitment required/);
});
