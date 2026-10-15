import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRegtestFundingCheckpoint,assertSameRegtestFunding} from './regtest-chain-continuity.mjs';
const checkpoint={version:1,chain:'regtest',fundingTxid:'a'.repeat(64),vout:0,amountSats:100000,
 scriptPubKeyHex:'a914'+'b'.repeat(40)+'87',fundingBlockHash:'c'.repeat(64),fundingBlockHeight:121};
const observed={chain:'regtest',fundingTxid:checkpoint.fundingTxid,vout:0,amountSats:100000,
 scriptPubKeyHex:checkpoint.scriptPubKeyHex,fundingBlockHash:checkpoint.fundingBlockHash,
 fundingBlockHeight:121,confirmations:1,unspent:true};
test('accepts only matching confirmed unspent regtest P2SH funding',()=>{
 assert.equal(validateRegtestFundingCheckpoint(checkpoint).chain,'regtest');
 assert.equal(assertSameRegtestFunding(checkpoint,observed).verified,true);
});
test('rejects changed chain, block identity, outpoint and amount',()=>{
 for(const patch of [{chain:'main'},{fundingBlockHash:'d'.repeat(64)},{fundingTxid:'e'.repeat(64)},
  {vout:1},{amountSats:99999},{scriptPubKeyHex:'a914'+'f'.repeat(40)+'87'}])
  assert.throws(()=>assertSameRegtestFunding(checkpoint,{...observed,...patch}));
});
test('rejects spent, unconfirmed, invalid or secret-bearing checkpoints',()=>{
 assert.throws(()=>assertSameRegtestFunding(checkpoint,{...observed,unspent:false}));
 assert.throws(()=>assertSameRegtestFunding(checkpoint,{...observed,confirmations:0}));
 assert.throws(()=>validateRegtestFundingCheckpoint({...checkpoint,seed:'forbidden'}));
 assert.throws(()=>validateRegtestFundingCheckpoint({...checkpoint,scriptPubKeyHex:'0014'+'b'.repeat(40)}));
});
