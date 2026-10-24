// Isolated Professional Option B: public gift link -> verified schedule ->
// independently retained binding digest -> confirmed, unspent Core outputs ->
// existing restricted beneficiary review. Regtest only; no wallet secrets.
// IMPORTANT: digest equality does not authenticate who delivered the digest.
import assert from 'node:assert/strict';
import {giftLocator} from './gift-link-public-candidate.mjs';
import {mapProfessionalGiftLocatorToSchedule} from './option-b-explicit-link-map.mjs';
import {verifyPublicRetailSchedule} from './public-retail-schedule-verify.mjs';
import {verifyProfessionalGiftBindingCommitment} from './public-gift-binding-commitment.mjs';
import {prepareLocallyVerifiedBeneficiaryReview} from './locally-verified-beneficiary-review.mjs';

export async function prepareOptionBFundedLinkReview({
 giftUrl,published,locatorMapping,binding,expectedBindingDigest,
 authorization,port,releaseIndex,publicHandoff,funding,approvedIntent
}) {
 const locator=giftLocator(giftUrl);
 assert.equal(locator.interval,published?.interval,'Gift link interval differs from published schedule');
 const mapped=mapProfessionalGiftLocatorToSchedule(giftUrl,published,locatorMapping);
 const schedule=verifyPublicRetailSchedule(published);
 assert.equal(binding?.network,'regtest','Regtest gift binding required');
 assert.equal(binding.releaseOutputs?.length,schedule.releaseCount,
  'Funded release count differs from published schedule');
 for (const release of schedule.releases) {
  const bound=binding.releaseOutputs[release.index];
  assert.equal(bound?.index,release.index,'Funded release order mismatch');
  assert.equal(bound?.scriptPubKeyHex,release.fundingScriptPubKeyHex,
   'Funded script differs from public release date at index '+release.index);
 }
 assert.ok(Number.isSafeInteger(releaseIndex)&&releaseIndex>=0&&
  releaseIndex<schedule.releaseCount,'Invalid selected release index');
 // The digest must be obtained by the recipient through an independent
 // authenticated channel; this function cannot establish that provenance.
 const commitment=verifyProfessionalGiftBindingCommitment(binding,expectedBindingDigest);
 const selected=schedule.releases[releaseIndex];
 assert.equal(publicHandoff?.fundingScriptPubKeyHex,selected.fundingScriptPubKeyHex,
  'Selected signer handoff differs from published release script');
 assert.equal(publicHandoff?.redeemScriptHex,selected.redeemScriptHex,
  'Selected signer handoff differs from published release redeem script');
 // Strip xpub-derivation annotations: the downstream signing boundary accepts\n // only the six explicitly permitted public handoff fields.\n const restrictedPublicHandoff=Object.freeze({\n  version:publicHandoff.version,network:publicHandoff.network,\n  signerPubkeyHex:publicHandoff.signerPubkeyHex,locktime:publicHandoff.locktime,\n  redeemScriptHex:publicHandoff.redeemScriptHex,\n  fundingAddress:publicHandoff.fundingAddress\n });\n const beneficiary=await prepareLocallyVerifiedBeneficiaryReview({
  authorization,port,binding,expectedBindingDigest,releaseIndex,
  publicHandoff:restrictedPublicHandoff,funding,approvedIntent
 });
 return Object.freeze({
  network:'regtest',format:'bc1q21-professional-option-b-funded-link-review-v1',
  giftLocatorAddress:locator.fundingAddress,
  publishedReleases:mapped.releases,
  verifiedReleaseCount:schedule.releaseCount,
  selectedReleaseIndex:releaseIndex,selectedReleaseDate:selected.date,
  bindingDigest:commitment.bindingDigest,
  scheduleScriptsMatchBinding:true,
  bindingMatchesRecipientSuppliedDigest:true,
  coreFundingVerifiedAtReviewCreation:true,
  // No identity or independent delivery evidence can be inferred from bytes.
  creatorAuthenticated:false,recipientCommitmentProvenanceVerified:false,
  beneficiaryAuthorized:false,canSign:false,canBroadcast:false,
  beneficiary
 });
}
