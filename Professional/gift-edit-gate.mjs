// Professional-only lifecycle guard. Never infer signed status from a QR scan or a diagnostic fixture.
export function createProfessionalGiftEditGate() {
  let state = 'planning';
  return Object.freeze({
    get state() { return state; },
    get canEdit() { return state === 'planning'; },
    get canFund() { return state === 'verified'; },
    startSigning() {
      if (state !== 'planning') throw Error('Cannot start signing outside planning.');
      state = 'signing';
    },
    cancelSigning() {
      if (state !== 'signing') throw Error('No signing attempt to cancel.');
      state = 'planning';
    },
    completeVerifiedSigning(verification) {
      // Integration must supply gift-specific, cryptographically verified evidence.
      // A camera scan, decoded QR, or regtest diagnostic is never enough.
      if (state !== 'signing') throw Error('No signing attempt awaiting verification.');
      if (!verification || verification.giftSpecificVerified !== true ||
          verification.transactionIntentBound !== true ||
          verification.diagnosticOnly !== false) {
        throw Error('Gift-specific Jade signature verification required.');
      }
      state = 'verified';
    },
    abandon() { state = 'abandoned'; },
  });
}
