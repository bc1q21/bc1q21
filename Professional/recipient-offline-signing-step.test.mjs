import test from 'node:test';
import assert from 'node:assert/strict';
import {renderProfessionalOfflineSigningStep} from './recipient-offline-signing-step.mjs';

const base={format:'bc1q21-professional-recipient-integration-v1',network:'regtest',canSign:false,canBroadcast:false,blockers:['Trusted chain source missing']};
test('recipient signing step is clearly disabled while authorization is missing',()=>{
 const html=renderProfessionalOfflineSigningStep(base);
 assert.match(html,/Prepare offline signing QR<\/button>/);
 assert.match(html,/disabled aria-disabled="true"/);
 assert.match(html,/Trusted chain source missing/);
 assert.match(html,/never enter them into this website/);
 assert.doesNotMatch(html,/<input[^>]*(seed|mnemonic|password)/i);
});
test('untrusted gift status cannot activate signing',()=>{
 assert.throws(()=>renderProfessionalOfflineSigningStep({...base,canSign:true}));
 assert.throws(()=>renderProfessionalOfflineSigningStep({...base,canBroadcast:true}));
 assert.throws(()=>renderProfessionalOfflineSigningStep({...base,network:'bitcoin'}));
});
test('blocker text is HTML escaped, never interpreted as markup',()=>{
 const html=renderProfessionalOfflineSigningStep({...base,blockers:['<script>alert(1)</script>']});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
