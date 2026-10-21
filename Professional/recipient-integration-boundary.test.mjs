// Lightweight source-boundary regression: the isolated test job deliberately
// does not install full wallet dependencies. Runtime integration is a separate gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('./recipient-integration-boundary.mjs',import.meta.url),'utf8');
test('recipient integration uses existing public gift and release gates',()=>{
  assert.match(source,/inspectRecipientReleaseReadiness/);
  assert.match(source,/mapProfessionalGiftLocatorToSchedule/);
  assert.match(source,/buildGiftSpecificOptionBView/);
});
test('recipient integration never exposes signing or broadcasting authorization',()=>{
  assert.doesNotMatch(source,/\b(?:mnemonicToSeed|createPrivateKey|broadcastTransaction)\s*\(/);
  assert.match(source,/canExportSigningQr:false,canSign:false,canBroadcast:false/);
  assert.match(source,/beneficiaryAuthorized:false/);
  assert.match(source,/chainProvenanceAuthenticated:false/);
});
test('integration rejects missing gift link and requires supplied schedule',()=>{
  assert.match(source,/if\(typeof giftUrl!=='string'\|\|!giftUrl\) throw Error\('Gift link required'\)/);
  assert.match(source,/buildGiftSpecificOptionBView\(giftUrl,published\)/);
});
