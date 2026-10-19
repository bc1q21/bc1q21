// bc1q21 Professional recipient release coordinator — deliberately fail-closed.
// Never mistake public link, caller-supplied RPC data, or schedule-return flags
// for beneficiary authorization or trusted hardware attestation.
import {inspectGiftSpecificCltvMaturity} from './gift-specific-cltv-maturity.mjs';

export function inspectRecipientReleaseReadiness({url,handoff,funding,checkpoint,coreEvidence,chainTip}) {
 const maturity=inspectGiftSpecificCltvMaturity(url,handoff,funding,checkpoint,coreEvidence,chainTip);
 const blockers=[
  'Trusted Bitcoin Core RPC provenance and current chain-tip continuity are not established',
  'Hardware-authenticated private schedule unlocking is not established',
  'Gift-specific beneficiary authorization is not established',
  'One-time recipient approval of exact release intent is not established'
 ];
 if(!maturity.cltvMatureForNextBlock)blockers.unshift('CLTV height has not matured');
 return Object.freeze({
  format:'bc1q21-professional-recipient-readiness-v1',
  network:'regtest',outpoint:maturity.outpoint,
  maturityObserved:maturity.cltvMatureForNextBlock,
  authorized:false,ready:false,
  blockers:Object.freeze(blockers),
  unsignedPsbt:null,signedPsbt:null,
  canSign:false,canBroadcast:false
 });
}
