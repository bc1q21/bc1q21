import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChainInfo, validateRegtestDestination} from './regtest-preflight-guards.mjs';

test('regtest only; rejects main, test and signet', () => {
  assert.deepEqual(validateChainInfo({chain:'regtest',blocks:0}),{chain:'regtest',blocks:0});
  for (const chain of ['main','test','signet',undefined]) {
    assert.throws(() => validateChainInfo({chain,blocks:100}));
  }
  assert.throws(() => validateChainInfo({chain:'regtest',blocks:'100'}));
});

test('local disposable regtest destination only', () => {
  const good={network:'regtest',disposable:true,rpcHost:'127.0.0.1',allowPublicBroadcast:false};
  assert.equal(validateRegtestDestination(good),true);
  for (const [key,value] of [['network','main'],['disposable',false],['rpcHost','remote.example'],['allowPublicBroadcast',true]]) {
    assert.throws(() => validateRegtestDestination({...good,[key]:value}));
  }
});
