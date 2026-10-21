// Runtime integration checks execute AFTER CI installs public-only dependencies.
// Uses the previously established disposable public xpub fixture; no seed/signing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {inspectProfessionalRecipientIntegration} from './recipient-integration-boundary.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const firstDate='2031-01-15';
const handoff=deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex:0,locktime:retailDateToCltvTimestamp(firstDate)});
const published={accountXpub,masterFingerprintHex,firstDate,interval:'month',outputScriptsHex:[handoff.fundingScriptPubKeyHex]};
const releaseLink='https://example.invalid/gift/'+handoff.fundingAddress+'?interval=month';
const creatorAddress='bcrt1q'+'q'.repeat(38);
const creatorLink='https://example.invalid/gift/'+creatorAddress+'?interval=month';
const commitment={fundingAddress:creatorAddress,releaseScriptsHex:published.outputScriptsHex};

test('legacy release-address link: script-matched date remains public but spending blocked',()=>{
 const result=inspectProfessionalRecipientIntegration({giftUrl:releaseLink,published});
 assert.equal(result.releases[0].date,firstDate);
 assert.equal(result.chainEvidenceInspected,false);
 assert.equal(result.canExportSigningQr,false);
 assert.equal(result.canSign,false);
 assert.equal(result.canBroadcast,false);
 assert.equal(result.ready,false);
 assert.equal(result.unsignedPsbt,null);
 assert.equal(result.signedPsbt,null);
 assert.equal(JSON.stringify(result).includes(accountXpub),false);
});
test('retail creator funding locator: mapping does not masquerade as release output',()=>{
 const result=inspectProfessionalRecipientIntegration({giftUrl:creatorLink,published,commitment});
 assert.equal(result.giftAddress,creatorAddress);
 assert.equal(result.releases.length,1);
 assert.equal(result.chainProvenanceAuthenticated,false);
 assert.equal(result.beneficiaryAuthorized,false);
 assert.equal(result.canSign,false);
 assert.match(result.blockers.join(' '),/mapping has not been independently authenticated/);
});
test('reject tampered public schedule and gift mapping',()=>{
 assert.throws(()=>inspectProfessionalRecipientIntegration({giftUrl:releaseLink,published:{...published,firstDate:'2031-01-16'}}));
 assert.throws(()=>inspectProfessionalRecipientIntegration({giftUrl:creatorLink,published,commitment:{...commitment,fundingAddress:handoff.fundingAddress}}));
 assert.throws(()=>inspectProfessionalRecipientIntegration({giftUrl:''}),/Gift link required/);
});
