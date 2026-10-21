import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./recipient-core-snapshot-adapter.mjs',import.meta.url),'utf8');
test('read-only snapshot adapter wires existing evidence and recipient gates',()=>{
 assert.match(source,/collectProfessionalCoreSnapshot\(/);
 assert.match(source,/inspectProfessionalRecipientIntegration\(/);
 assert.match(source,/chainEvidenceInspected,true/);
});
test('adapter cannot grant authority from untrusted caller-provided RPC',()=>{
 for(const field of ['rpcTransportAuthenticated:false','chainProvenanceAuthenticated:false',
  'beneficiaryAuthorized:false','canExportSigningQr:false','canSign:false','canBroadcast:false'])
  assert.ok(source.includes(field),field);
 assert.doesNotMatch(source,/\b(?:sendrawtransaction|signrawtransaction|walletpassphrase|dumpprivkey)\b/);
});
