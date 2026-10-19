// Professional-only, read-only regtest integration.
// Match one public gift schedule to outputs in ONE actual serialized transaction.
// Transaction bytes alone do NOT prove chain inclusion, confirmation, or unspent status.
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {mapProfessionalGiftLocatorToSchedule} from './option-b-explicit-link-map.mjs';

export function bindOneGiftToRawFundingTransaction(giftUrl,published,commitment,rawFundingTxHex) {
 const mapped=mapProfessionalGiftLocatorToSchedule(giftUrl,published,commitment);
 assert.equal(typeof rawFundingTxHex,'string','Raw funding transaction hex required');
 assert.match(rawFundingTxHex,/^(?:[0-9a-f]{2})+$/i,'Malformed funding transaction hex');
 const tx=bitcoin.Transaction.fromHex(rawFundingTxHex);
 assert.ok(tx.ins.length>0&&tx.outs.length>0,'Empty funding transaction');
 const seen=new Set();
 const releaseOutputs=published.outputScriptsHex.map((script,index)=>{
  const matches=[];
  tx.outs.forEach((out,vout)=>{
   if(Buffer.from(out.script).toString('hex')===script.toLowerCase())
    matches.push({vout,sats:out.value});
  });
  assert.equal(matches.length,1,'Each release script must match exactly one transaction output');
  const output=matches[0];
  assert.ok(!seen.has(output.vout),'Release outputs must be distinct');
  seen.add(output.vout);
  assert.ok(Number.isSafeInteger(output.sats)&&output.sats>0,'Invalid funded release amount');
  return Object.freeze({index,vout:output.vout,sats:output.sats,scriptPubKeyHex:script.toLowerCase()});
 });
 return Object.freeze({
  format:'bc1q21-professional-one-gift-raw-funding-binding-v1',network:'regtest',
  giftLocatorAddress:mapped.giftLocatorAddress,fundingTxid:tx.getId(),
  releaseCount:releaseOutputs.length,releaseOutputs:Object.freeze(releaseOutputs),
  evidenceLevel:'raw-transaction-script-match-only',
  txidCryptographicallyDerived:true,chainVerified:false,confirmed:false,
  unspentVerified:false,creatorAuthenticated:false,recipientAuthenticated:false,
  readyForLiveRouting:false,canSign:false,canBroadcast:false
 });
}
