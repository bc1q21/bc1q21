import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConsensusPreflight,requireMempoolAcceptance} from './regtest-consensus-result-guard.mjs';

const txid='a'.repeat(64);
const config={chainInfo:{chain:'regtest',blocks:110},destination:{network:'regtest',disposable:true,rpcHost:'127.0.0.1',allowPublicBroadcast:false}};

test('consensus preflight fails closed on non-regtest and remote RPC',()=>{
 assert.equal(validateConsensusPreflight(config).chain,'regtest');
 assert.throws(()=>validateConsensusPreflight({...config,chainInfo:{chain:'main',blocks:110}}));
 assert.throws(()=>validateConsensusPreflight({...config,destination:{...config.destination,rpcHost:'192.168.1.10'}}));
});

test('accepts exactly one matching explicit Bitcoin Core allowed=true result',()=>{
 assert.deepEqual(requireMempoolAcceptance([{txid,allowed:true}],txid),{txid,acceptedByRegtestMempool:true,confirmedInBlock:false});
});

test('rejects missing-input, non-final, script and malformed results',()=>{
 for(const reason of ['missing-inputs','non-final','mandatory-script-verify-flag-failed']) {
  assert.throws(()=>requireMempoolAcceptance([{txid,allowed:false,'reject-reason':reason}],txid));
 }
 assert.throws(()=>requireMempoolAcceptance([],txid));
 assert.throws(()=>requireMempoolAcceptance([{txid,allowed:true},{txid,allowed:true}],txid));
 assert.throws(()=>requireMempoolAcceptance([{txid:'b'.repeat(64),allowed:true}],txid));
 assert.throws(()=>requireMempoolAcceptance([{txid,allowed:'true'}],txid));
 assert.throws(()=>requireMempoolAcceptance([{txid,allowed:true,'reject-reason':'unexpected'}],txid));
});
