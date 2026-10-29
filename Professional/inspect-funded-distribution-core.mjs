// bc1q21 Professional: read-only Core gettxout consistency inspection.
// Caller-supplied responses are UNTRUSTED. This module never connects to RPC,
// authenticates a node, or authorizes Jade signing or Bitcoin broadcast.
import {parseBitcoinCoreGettxout} from './bitcoin-core-gettxout-adapter.mjs';
const fail=m=>{throw Error('Professional funding inspection: '+m)};
export function inspectFundedDistributionCoreSnapshots(intent,observations) {
 if(intent?.format!=='bc1q21-professional-funded-distribution-intent-v1'||
    intent.network!=='regtest'||!Array.isArray(intent.inputs)||!intent.inputs.length||
    intent.signed!==false||intent.broadcastAuthorized!==false)
   fail('Expected unsigned regtest funded distribution intent');
 if(!Array.isArray(observations)||observations.length!==intent.inputs.length)
   fail('One Core gettxout observation required per input');
 const matched=[];
 for(let i=0;i<intent.inputs.length;i++){
   const input=intent.inputs[i],observation=observations[i];
   if(observation?.txid!==input.txid||observation?.vout!==input.vout)
     fail('Core observation outpoint does not match intended input');
   const parsed=parseBitcoinCoreGettxout(input.txid,input.vout,observation.response);
   if(parsed.valueSats!==input.valueSats||
      parsed.scriptPubKeyHex!==input.scriptPubKeyHex.toLowerCase())
     fail('Core observation value or script differs from funded intent');
   matched.push(Object.freeze({txid:parsed.txid,vout:parsed.vout,
     valueSats:parsed.valueSats,scriptPubKeyHex:parsed.scriptPubKeyHex}));
 }
 return Object.freeze({
   format:'bc1q21-professional-core-funding-consistency-v1',
   network:'regtest',matchedInputCount:matched.length,
   matchedInputs:Object.freeze(matched),
   snapshotsConsistent:true,
   rpcProvenanceVerified:false,chainVerified:false,
   fundingOutpointsVerified:false,giftSpecificVerified:false,
   broadcastAuthorized:false,canSign:false,canBroadcast:false,
   nextStep:'AUTHENTICATE_BITCOIN_CORE_RPC_AND_RECHECK_BEFORE_SIGNING'
 });
}
