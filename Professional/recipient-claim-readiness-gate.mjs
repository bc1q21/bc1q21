// bc1q21 Professional — isolated fail-closed recipient signing readiness.
// THIS IS NOT A HARDWARE WALLET IMPLEMENTATION. No secrets or network.
const EXACT=['format','network','giftIdBound','onChainFunded','publicScriptsMatched','dateScriptMatched','offlineDateRecoveryAuthenticated','offlineSignerReady','psbtVerified','matured','unspent','recipientDestinationVerified'];
const isTrue=value=>value===true;
export function assessClaimReadiness(proof){
  const failures=[];
  if(!proof||typeof proof!=='object'||Array.isArray(proof))
    return {ready:false,status:'blocked',failures:['Missing verification evidence']};
  if(Object.keys(proof).sort().join('|')!==[...EXACT].sort().join('|'))
    failures.push('Unexpected or missing verification fields');
  if(proof.format!=='bc1q21-professional-recipient-signing-gate-v1')
    failures.push('Unsupported verification format');
  if(proof.network!=='regtest') failures.push('This prototype accepts regtest only');
  const required={
    giftIdBound:'Gift-card link not independently bound to gift',
    onChainFunded:'Funding transaction not independently verified',
    publicScriptsMatched:'Public wallet release keys/scripts not matched',
    dateScriptMatched:'Recovered date does not match funded time-lock scripts',
    offlineDateRecoveryAuthenticated:'Offline date recovery provenance not authenticated',
    offlineSignerReady:'Trusted offline signer not ready',
    psbtVerified:'Unsigned PSBT not independently verified',
    matured:'Release has not reached its Bitcoin CLTV maturity',
    unspent:'Funding output absent or already spent',
    recipientDestinationVerified:'Recipient destination not independently verified'
  };
  for(const [field,reason] of Object.entries(required))
    if(!isTrue(proof[field])) failures.push(reason);
  return {ready:failures.length===0,status:failures.length?'blocked':'eligible-for-user-approval',failures};
}
export function publicOnlyProof(){
  return {
    format:'bc1q21-professional-recipient-signing-gate-v1',
    network:'regtest',
    giftIdBound:false,
    onChainFunded:true,
    publicScriptsMatched:true,
    dateScriptMatched:true,
    offlineDateRecoveryAuthenticated:false,
    offlineSignerReady:false,
    psbtVerified:false,
    matured:false,
    unspent:true,
    recipientDestinationVerified:false
  };
}
