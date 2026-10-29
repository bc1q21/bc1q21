// bc1q21 Professional — regtest-only pre-signing evidence inventory.
// This stage never grants signing permission: it identifies precisely which
// independent trust checks are still missing from the combined inspection.
import {inspectFundedGiftUnsignedTransaction} from './inspect-funded-gift-unsigned.mjs';
const fail=m=>{throw Error('Professional pre-signing review: '+m)};
export function reviewProfessionalPreSigningEvidence(args) {
 const combined=inspectFundedGiftUnsignedTransaction(args);
 if(combined.unsignedTransactionMatchesSuppliedIntent!==true||
    combined.publicFundingSnapshotsConsistent!==true||
    combined.cltvScriptsMatchSuppliedRecipientKeys!==true||
    combined.network!=='regtest')
   fail('Incomplete transaction consistency inspection');
 // IMPORTANT: externally supplied booleans, signatures or RPC-like data
 // cannot authenticate the wallet, node or customer's approval.
 return Object.freeze({
  format:'bc1q21-professional-pre-signing-review-v1',
  network:'regtest',
  approvedPsbtSha256:combined.approvedPsbtSha256,
  unsignedTransactionConsistent:true,
  recipientKeyOriginAuthenticated:false,
  authenticatedBitcoinCoreFunding:false,
  independentGiftApproval:false,
  recipientRecoveryVerified:false,
  requiredBeforeSigning:Object.freeze([
   'Authenticate Jade-derived recipient public keys against an independently confirmed wallet identity',
   'Obtain fresh funding UTXOs through trusted server-side Bitcoin Core RPC and bind them to this exact PSBT',
   'Independently approve all recipient scripts, dates, amounts, service fee and change output',
   'Validate beneficiary recovery and future release compatibility'
  ]),
  signingAuthorized:false,canSign:false,canBroadcast:false,
  nextStep:'IMPLEMENT_PROVENANCE_AND_INDEPENDENT_APPROVAL_BEFORE_ENABLE_SIGNING'
 });
}
