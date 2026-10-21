// bc1q21 Professional: gift-specific recipient integration boundary.
// Read-only regtest reconciliation; NOT a signing authorization service.
// No private material, network requests, QR export, signing or broadcasting.
import {buildGiftSpecificOptionBView} from './gift-specific-option-b-view.mjs';
import {mapProfessionalGiftLocatorToSchedule} from './option-b-explicit-link-map.mjs';
import {inspectRecipientReleaseReadiness} from './gift-specific-recipient-release-gate.mjs';
import {verifyProfessionalPublicHandoff} from './public-handoff.mjs';

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
    // Retail gift card locator can differ from its individual release outputs.
    // First validate the explicit script mapping, then bind the selected release
    // to its verified CLTV script. Never pass the creator locator as a release URL.
    const releaseUrl=commitment===undefined?giftUrl:(()=>{
      const verified=verifyProfessionalPublicHandoff(publicHandoff);
      if(verified.fundingScriptPubKeyHex.toLowerCase()!==commitment.releaseScriptsHex[0].toLowerCase())
        throw Error('Selected release script does not match retail gift mapping');
      return 'https://professional-regtest.invalid/gift/'+verified.fundingAddress;
    })();
    release=inspectRecipientReleaseReadiness({
      url:releaseUrl,handoff:publicHandoff,funding,checkpoint,coreEvidence,chainTip
    });
    blockers.push(...release.blockers);
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
