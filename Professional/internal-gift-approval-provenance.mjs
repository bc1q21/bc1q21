// Professional-only, in-process approval provenance. The private WeakSet
// prevents a caller from fabricating a trusted approval by copying JSON fields.
// This is not durable authorization across processes, restarts or machines.
const issued = new WeakSet();
const consumed = new WeakSet();

export function issueInternalGiftApprovalReceipt(fields) {
 const receipt=Object.freeze({...fields});
 issued.add(receipt);
 return receipt;
}

export function consumeInternalGiftApprovalReceipt(receipt) {
 if(!receipt||typeof receipt!=='object'||!issued.has(receipt))
  throw Error('Approval receipt was not issued by this process');
 if(consumed.has(receipt))throw Error('Approval receipt already consumed');
 consumed.add(receipt);
 return Object.freeze({
  network:receipt.network,releaseIndex:receipt.releaseIndex,
  observedTip:receipt.observedTip,psbtSha256:receipt.psbtSha256,
  approvalRecorded:receipt.approvalRecorded,
  // Still cannot grant signing, QR export or beneficiary identity.
  beneficiaryAuthorized:false,canExportSigningQr:false,canSign:false,canBroadcast:false
 });
}
