// Offline-only disposable-fixture schedule unlock pipeline.
// Never bundle this module into the networked recipient page.
// The currentPassphrase argument is a wallet-derived reusable secret in real use:
// it must NEVER cross the air gap. This prototype accepts synthetic fixtures only.
// No BIP39 derivation, hardware approval, transaction signing, or broadcast.
import { decryptRetailDateOffline } from './offline-retail-date-decrypt.mjs';
import { composeApprovedPublicScheduleResponse } from './synthetic-offline-schedule-compose.mjs';

export function unlockSyntheticRetailScheduleOffline({encryptedHex,currentPassphrase,
 challenge,giftTxid,outputScriptsHex,interval,approved,retailFirstDateHex=false}) {
 if (approved !== true) throw Error('Explicit offline approval required');
 const firstDate=decryptRetailDateOffline({encryptedHex,currentPassphrase,retailFirstDateHex});
 const response=composeApprovedPublicScheduleResponse({challenge,giftTxid,
  outputScriptsHex,firstDate,interval,approved});
 // The only returned data is public context and authorized release schedule.
 return Object.freeze(response);
}
