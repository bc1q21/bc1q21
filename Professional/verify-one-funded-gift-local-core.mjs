// One REAL disposable 24-output regtest funding lifecycle evidence check.
// Runs after the existing creator funding workflow against localhost Bitcoin Core.
// Public descriptors are fixtures, not creator/recipient identity authentication.
// No signing, wallet RPC, transaction submission, secrets or mainnet operations.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import bitcoin from 'bitcoinjs-lib';
import {createLocalRegtestReadOnlyRpc} from './one-gift-local-regtest-rpc.mjs';

const [fixtureFile,discoveryFile]=process.argv.slice(2);
assert.ok(fixtureFile&&discoveryFile,'Public fixture and independently generated discovery required');
const fixture=JSON.parse(readFileSync(fixtureFile,'utf8'));
const discovery=JSON.parse(readFileSync(discoveryFile,'utf8'));
assert.equal(fixture.format,'bc1q21-professional-watchonly-review-v1');
assert.equal(fixture.network,'regtest');
assert.equal(fixture.privateKeysIncluded,false);
assert.equal(discovery.format,'bc1q21-professional-single-regtest-gift-discovery-v1');
assert.equal(discovery.network,'regtest');
assert.equal(discovery.releaseOutputs.length,24);
assert.equal(fixture.descriptors.length,24);
const rpc=createLocalRegtestReadOnlyRpc({username:'regtest',password:'disposable',port:18443});
const start=await rpc('getblockchaininfo');
assert.equal(start.chain,'regtest');
const txid=discovery.fundingTxid;
assert.match(txid,/^[a-f0-9]{64}$/);
const tx=await rpc('getrawtransaction',[txid,true]);
assert.equal(tx.txid,txid);
assert.match(tx.blockhash,/^[a-f0-9]{64}$/);
const raw=await rpc('getrawtransaction',[txid,false]);
const parsed=bitcoin.Transaction.fromHex(raw);
assert.equal(parsed.getId(),txid,'Raw transaction txid mismatch');
const header=await rpc('getblockheader',[tx.blockhash,true]);
assert.equal(header.hash,tx.blockhash);
assert.ok(header.confirmations>=1&&header.height>=1);
const verified=[];
for(const desc of fixture.descriptors){
 const script=desc.scriptPubKey;
 const matches=parsed.outs.map((o,vout)=>({vout,sats:o.value,script:Buffer.from(o.script).toString('hex')}))
  .filter(o=>o.script===script);
 assert.equal(matches.length,1,'Each gift script must have one funding output');
 const output=matches[0];
 assert.equal(output.sats,desc.sats,'Funding amount mismatch');
 const recorded=discovery.releaseOutputs.find(o=>o.index===desc.index);
 assert.ok(recorded,'Missing gift discovery index');
 assert.equal(recorded.vout,output.vout,'Gift output index mismatch');
 assert.equal(recorded.scriptPubKey,script,'Gift script mismatch');
 assert.equal(recorded.sats,output.sats,'Gift amount mismatch');
 const utxo=await rpc('gettxout',[txid,output.vout,true]);
 assert.ok(utxo&&utxo.confirmations>=1,'Gift output missing, spent or unconfirmed');
 assert.equal(utxo.bestblock,start.bestblockhash,'UTXO best block not chain tip');
 assert.equal(utxo.scriptPubKey.hex,script,'Bitcoin Core UTXO script mismatch');
 assert.equal(Math.round(utxo.value*1e8),output.sats,'Bitcoin Core UTXO amount mismatch');
 verified.push(output.vout);
}
assert.equal(new Set(verified).size,24,'Repeated funded outpoint');
const finish=await rpc('getblockchaininfo');
assert.equal(finish.chain,'regtest');
assert.equal(finish.bestblockhash,start.bestblockhash,'Regtest chain tip changed during observation');
assert.equal(finish.blocks,start.blocks,'Regtest height changed during observation');
const lastHeader=await rpc('getblockheader',[tx.blockhash,true]);
assert.equal(lastHeader.hash,header.hash);
assert.equal(lastHeader.height,header.height);
assert.ok(lastHeader.confirmations>=1,'Funding block disconnected');
console.log(JSON.stringify({
 result:'PASS_REAL_CORE_ONE_GIFT_24_UTXOS',
 network:'regtest',fundingTxid:txid,outputsVerified:verified.length,
 blockHeight:finish.blocks,tipHash:finish.bestblockhash,
 localReadOnlyCoreQueried:true,consistentConfirmedUnspent:true,
 creatorAuthenticated:false,recipientAuthenticated:false,
 privateSigningPerformed:false,canSign:false,canBroadcast:false
}));
