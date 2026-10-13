// Isolated Professional: finalization with mandatory independent raw transaction
// audit. Caller must provide independently approved public transaction details.
// No keys, signing, network access, or broadcast.
import { finalizeVerifiedProfessionalRelease } from './finalize-verified-release.mjs';
import { auditFinalizedProfessionalTransaction } from './audit-finalized-transaction.mjs';
const fail=m=>{throw Error('Professional audited finalization: '+m)};
export function finalizeAndAuditProfessionalRelease(originalUnsignedBase64,returnedSignedBase64,approvedSha256,approvedTransaction){
 if(!approvedTransaction||typeof approvedTransaction!=='object'||Array.isArray(approvedTransaction))
  fail('Independent transaction approval record required');
 const finalized=finalizeVerifiedProfessionalRelease(originalUnsignedBase64,returnedSignedBase64,approvedSha256);
 const audit=auditFinalizedProfessionalTransaction(finalized.rawTransactionHex,approvedTransaction);
 if(audit.txid!==finalized.txid||audit.signatureCryptographicallyVerified!==true||
    audit.finalTransactionVerified!==true)fail('Final transaction audit mismatch');
 return Object.freeze({...finalized,independentFinalAuditPassed:true,
  feeSats:audit.feeSats,finalTransactionSha256:audit.rawSha256,
  broadcast:false});
}
