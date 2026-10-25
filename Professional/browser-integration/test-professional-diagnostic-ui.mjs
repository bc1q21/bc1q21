// Professional-only offline diagnostic UI smoke test. No keys, network, or broadcast.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const html = readFileSync('professional-verification-diagnostic.html', 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Inline diagnostic controller missing');
function element() {
  return { value: '', disabled: false, dataset: {}, textContent: '', files: [],
    listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } };
}
const controls = Object.fromEntries(['status', 'verify', 'frames', 'file'].map(k => [k, element()]));
const sandbox = {
  document: { getElementById: k => controls[k] },
  bc1q21ProfessionalVerify: async () => ({
    signatureCryptographicallyVerified: true, transactionMatches: true, broadcast: false
  })
};
runInNewContext(script, sandbox);
const click = () => controls.verify.listeners.click();
assert.equal(controls.status.dataset.state, undefined, 'Initial status must remain unverified');
controls.frames.value = 'ur:crypto-psbt/1-1/example';
await click();
assert.equal(controls.status.dataset.state, 'pass');
assert.match(controls.status.textContent, /No transaction was broadcast/);
controls.frames.listeners.input();
assert.equal(controls.status.dataset.state, 'idle', 'Edited data must revoke verification');
sandbox.bc1q21ProfessionalVerify = async () => ({
  signatureCryptographicallyVerified: true, transactionMatches: false, broadcast: false
});
await click();
assert.equal(controls.status.dataset.state, 'fail', 'Transaction mismatch must fail closed');
sandbox.bc1q21ProfessionalVerify = async () => ({
  signatureCryptographicallyVerified: true, transactionMatches: true, broadcast: true
});
await click();
assert.equal(controls.status.dataset.state, 'fail', 'Broadcast-capable result must fail closed');
sandbox.bc1q21ProfessionalVerify = async () => { throw Error('Signature rejected'); };
await click();
assert.equal(controls.status.dataset.state, 'fail', 'Verifier exception must fail closed');
assert.equal(controls.verify.disabled, false, 'Button must recover after error');
let resolvePending;
sandbox.bc1q21ProfessionalVerify = () => new Promise(resolve => { resolvePending = resolve; });
controls.frames.value = 'ur:crypto-psbt/1-1/before';
const pending = click();
controls.frames.value = 'ur:crypto-psbt/1-1/after';
controls.frames.listeners.input();
resolvePending({ signatureCryptographicallyVerified: true, transactionMatches: true, broadcast: false });
await pending;
assert.equal(controls.status.dataset.state, 'idle', 'Stale verification must not override edited data');
assert.equal(controls.verify.disabled, false, 'Button must recover after stale result');
console.log('PASS: Professional diagnostic UI fail-closed and stale-result safeguards; no network or broadcast');
