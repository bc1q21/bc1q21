// Isolated Professional: inspect source for accidental use of unapproved QR
// encoding in the controlled workflow. This is a structural guardrail, not
// a security sandbox: legacy utilities remain directly importable in tests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const controlled=readFileSync('Professional/controlled-qr-session.mjs','utf8');
const required=[
 "createProfessionalTransactionConfirmation(",
 "prepareApprovedProfessionalRelease(",
 "createOneTimeApprovedHandoff(",
 "coordinator.handoff()",
 "makeCryptoPsbtFrames(bytes,options)"
];
for(const part of required)assert.ok(controlled.includes(part),'Controlled QR flow missing '+part);
assert.ok(controlled.indexOf('coordinator.handoff()')<controlled.indexOf('makeCryptoPsbtFrames(bytes,options)'),
 'QR encoding must follow consumed approval');
assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|sendRawTransaction|broadcastTransaction)\s*\(/.test(controlled),
 'Controlled QR workflow must not communicate or broadcast');
console.log('PASS: controlled QR workflow source requires consumed approval before QR encoding and contains no broadcast calls');
