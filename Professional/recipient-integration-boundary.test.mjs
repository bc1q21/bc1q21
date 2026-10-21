import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectProfessionalRecipientIntegration} from './recipient-integration-boundary.mjs';

test('recipient integration exposes no signing or broadcasting API',()=>{
  const source=readFileSync(new URL('./recipient-integration-boundary.mjs',import.meta.url),'utf8');
  assert.match(source,/inspectRecipientReleaseReadiness/);
  assert.match(source,/mapProfessionalGiftLocatorToSchedule/);
  assert.doesNotMatch(source,/\b(?:mnemonicToSeed|createPrivateKey|broadcastTransaction)\s*\(/);
  assert.match(source,/canExportSigningQr:false,canSign:false,canBroadcast:false/);
});
test('missing gift link fails closed',()=>{
  assert.throws(()=>inspectProfessionalRecipientIntegration({giftUrl:''}),/Gift link required/);
});
test('unverified schedule cannot become a signing request',()=>{
  assert.throws(()=>inspectProfessionalRecipientIntegration({
    giftUrl:'https://example.invalid/gift/3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA?interval=month',
    published:null
  }));
});
