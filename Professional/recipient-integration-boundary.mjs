// bc1q21 Professional: gift-specific recipient integration boundary.
// Read-only regtest reconciliation; NOT a signing authorization service.
// No private material, network requests, QR export, signing or broadcasting.
import {buildGiftSpecificOptionBView} from './gift-specific-option-b-view.mjs';
import {mapProfessionalGiftLocatorToSchedule} from './option-b-explicit-link-map.mjs';
import {inspectRecipientReleaseReadiness} from './gift-specific-recipient-release-gate.mjs';

// Separate public schedule visibility from spending authority. Even a matching
// script and a caller-supplied Bitcoin Core response are not trusted provenance.
export function inspectProfessionalRecipientIntegration({
  giftUrl, published, commitment, publicHandoff, funding,
  checkpoint, coreEvidence, chainTip
}) {
  if(typeof giftUrl!=='string'||!giftUrl) throw Error('Gift link required');
  const schedule=commitment===undefined
    ?buildGiftSpecificOptionBView(giftUrl,published)
    :mapProfessionalGiftLocatorToSchedule(giftUrl,published,commitment);
  let release=null;
  const blockers=[];
  if(commitment!==undefined) {
    blockers.push('Creator gift-link mapping has not been independently authenticated');
  }
  if(publicHandoff&&funding&&checkpoint&&coreEvidence&&chainTip) {
    // Only the legacy first-release-address locator can be checked by the
    // existing release gate. Never misapply it to a creator funding locator.
    if(commitment===undefined) {
      release=inspectRecipientReleaseReadiness({
        url:giftUrl,handoff:publicHandoff,funding,checkpoint,coreEvidence,chainTip
      });
      blockers.push(...release.blockers);
    } else {
      blockers.push('Creator funding locator to release-outpoint chain binding is not implemented');
    }
  } else {
    blockers.push('Gift-specific trusted chain and funding evidence not supplied');
  }
  blockers.push('Trusted beneficiary approval and signed-return session not integrated');
  return Object.freeze({
    format:'bc1q21-professional-recipient-integration-v1',
    network:'regtest',
    giftAddress:commitment===undefined?schedule.fundingAddress:schedule.giftLocatorAddress,
    releases:schedule.releases,
    schedulePublic:true,
    chainEvidenceInspected:release!==null,
    chainProvenanceAuthenticated:false,
    beneficiaryAuthorized:false,
    ready:false,
    blockers:Object.freeze([...new Set(blockers)]),
    unsignedPsbt:null,signedPsbt:null,
    canExportSigningQr:false,canSign:false,canBroadcast:false
  });
}
