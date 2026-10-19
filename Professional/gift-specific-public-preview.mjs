// bc1q21 Professional — strict public recipient preview boundary (regtest only).
// This module intentionally never authorizes a release or discloses a schedule.
import {giftLocator, inspectCandidates} from './gift-link-public-candidate.mjs';

export function inspectGiftSpecificPreview(url, transactions) {
  const locator = giftLocator(url);
  const inspected = inspectCandidates(locator, transactions);
  // Ambiguity and lack of cryptographic gift binding are explicit blockers.
  const candidate = inspected.state === 'preview-only' ? inspected.candidates[0] : null;
  return Object.freeze({
    format: 'bc1q21-professional-public-preview-v1',
    network: 'regtest',
    locator: Object.freeze({...locator}),
    state: inspected.state,
    authenticated: false,
    scheduleUnlocked: false,
    canConstructRelease: false,
    canSign: false,
    canBroadcast: false,
    releaseCount: candidate?.releaseCount ?? null,
    totalSats: candidate ? candidate.outputs.reduce((sum, output) => {
      if (!Number.isSafeInteger(sum + output.sats)) throw Error('Unsafe total');
      return sum + output.sats;
    }, 0) : null,
    // Never return candidate scripts, locktimes, xpubs, keys or private dates.
    reason: 'Public gift locator and transaction candidates do not establish recipient authorization'
  });
}
