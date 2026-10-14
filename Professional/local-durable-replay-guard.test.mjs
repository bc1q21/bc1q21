// Isolated Professional durable replay regression: filesystem only, synthetic outpoints.
// No signing material, Bitcoin network, transaction submission, or broadcasts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createLocalDurableProfessionalReplayGuard } from './local-durable-replay-guard.mjs';

const TXID = 'ab'.repeat(32);
const OTHER = 'cd'.repeat(32);
function withLedger(run) {
 const directory = mkdtempSync(join(tmpdir(), 'professional-replay-test-'));
 try { return run(directory); }
 finally { rmSync(directory, { recursive: true, force: true }); }
}
function childClaim(directory, txid, vout) {
 const code = `import {createLocalDurableProfessionalReplayGuard} from ${JSON.stringify(new URL('./local-durable-replay-guard.mjs', import.meta.url).href)};
 createLocalDurableProfessionalReplayGuard(process.argv[1]).claim(process.argv[2], Number(process.argv[3]));`;
 return spawnSync(process.execPath, ['--input-type=module', '-e', code, directory, txid, String(vout)], {
  encoding: 'utf8', timeout: 10000
 });
}
test('claim survives a new guard instance and a separate Node process', () => withLedger(directory => {
 const first = createLocalDurableProfessionalReplayGuard(directory);
 assert.equal(first.claim(TXID, 0), true);
 const reopened = createLocalDurableProfessionalReplayGuard(directory);
 assert.equal(reopened.has(TXID, 0), true);
 assert.throws(() => reopened.claim(TXID.toUpperCase(), 0), /already claimed/);
 const processResult = childClaim(directory, TXID, 0);
 assert.notEqual(processResult.status, 0);
 assert.match(processResult.stderr, /already claimed/);
 assert.equal(reopened.claim(TXID, 1), true);
 assert.equal(reopened.claim(OTHER, 0), true);
}));
test('concurrent separate processes allow exactly one claimant', async () => {
 const { spawn } = await import('node:child_process');
 await new Promise((resolve, reject) => {
  const directory = mkdtempSync(join(tmpdir(), 'professional-replay-race-'));
  const code = `import {createLocalDurableProfessionalReplayGuard} from ${JSON.stringify(new URL('./local-durable-replay-guard.mjs', import.meta.url).href)};
  createLocalDurableProfessionalReplayGuard(process.argv[1]).claim(process.argv[2], 0);`;
  const statuses = [];
  let remaining = 8;
  const finish = () => {
   if (--remaining !== 0) return;
   try {
    assert.equal(statuses.filter(s => s === 0).length, 1);
    assert.equal(statuses.length, 8);
    assert.equal(createLocalDurableProfessionalReplayGuard(directory).has(TXID, 0), true);
    resolve();
   } catch (error) { reject(error); }
   finally { rmSync(directory, { recursive: true, force: true }); }
  };
  for (let i = 0; i < 8; i++) {
   const child = spawn(process.execPath, ['--input-type=module', '-e', code, directory, TXID], { stdio: 'ignore' });
   child.once('error', error => { statuses.push(-1); finish(); });
   child.once('exit', code => { statuses.push(code); finish(); });
  }
 });
});
test('corrupted or incomplete claim never becomes a reusable outpoint', () => withLedger(directory => {
 const guard = createLocalDurableProfessionalReplayGuard(directory);
 guard.claim(TXID, 0);
 const filename = join(directory, readdirSync(directory)[0]);
 for (const invalid of ['', '{', '{}', JSON.stringify({version:1,network:'mainnet',outpoint:TXID+':0',claimed:true})]) {
  writeFileSync(filename, invalid);
  assert.throws(() => guard.has(TXID, 0));
  assert.throws(() => guard.claim(TXID, 0), /already claimed/);
 }
 // Recovery requires independent operator review; never silently delete a claim.
 assert.equal(readdirSync(directory).length, 1);
}));
test('missing claims are unclaimed, malformed outpoints fail closed', () => withLedger(directory => {
 const guard = createLocalDurableProfessionalReplayGuard(directory);
 assert.equal(guard.has(TXID, 0), false);
 assert.throws(() => guard.claim('../unsafe', 0), /Invalid public outpoint/);
 assert.throws(() => guard.claim(TXID, -1), /Invalid public outpoint/);
 assert.equal(readdirSync(directory).length, 0);
}));
