import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFundedDistributionCoreSnapshots} from './inspect-funded-distribution-core.mjs';
import {createProfessionalGiftEditGate} from './gift-edit-gate.mjs';
const txid='ab'.repeat(32),script='0014'+'11'.repeat(20);
const intent={format:'bc1q21-professional-funded-distribution-intent-v1',network:'regtest',
 signed:false,broadcastAuthorized:false,
 inputs:[{txid,vout:0,valueSats:100000,scriptPubKeyHex:script}]};
const observation={txid,vout:0,response:{
 value:0.001,confirmations:3,scriptPubKey:{hex:script}
}};
test('matching caller-supplied Core observations never confer signing authority',()=>{
 const result=inspectFundedDistributionCoreSnapshots(intent,[observation]);
 assert.equal(result.snapshotsConsistent,true);
 assert.equal(result.chainVerified,false);
 assert.equal(result.rpcProvenanceVerified,false);
 assert.equal(result.canSign,false);
 const gate=createProfessionalGiftEditGate();gate.startFunding();
 assert.throws(()=>gate.confirmFunding(result));
 assert.equal(gate.state,'funding');
});
test('rejects wrong outpoint, value, script, unconfirmed or spent UTXO',()=>{
 assert.throws(()=>inspectFundedDistributionCoreSnapshots(intent,[{...observation,vout:1}]));
 assert.throws(()=>inspectFundedDistributionCoreSnapshots(intent,[{...observation,response:{...observation.response,value:0.002}}]));
 assert.throws(()=>inspectFundedDistributionCoreSnapshots(intent,[{...observation,response:{...observation.response,scriptPubKey:{hex:'0014'+'22'.repeat(20)}}}]));
 assert.throws(()=>inspectFundedDistributionCoreSnapshots(intent,[{...observation,response:{...observation.response,confirmations:0}}]));
 assert.throws(()=>inspectFundedDistributionCoreSnapshots(intent,[{...observation,response:null}]));
 assert.throws(()=>inspectFundedDistributionCoreSnapshots(intent,[]));
});
