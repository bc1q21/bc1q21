import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { snapshotRetailGiftPlan } from './retail-plan-bridge.mjs';

const valid = () => ({
  navigationState: { currentStep: 'finish_schedule' },
  scheduleRows: [{ date: '2030-01-01', btc: 0.00012 }, { date: '2031-01-01', btc: 0.00013 }],
  btcAmount: 0.00025,
  schedulePlanner: { isValidReleaseDate: date => /^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(date) },
  hasDustGiftOutputs: () => false
});
test('Retail plan bridge preserves release dates and satoshis without spending authority', () => {
  const plan = snapshotRetailGiftPlan(valid());
  assert.deepEqual(plan.releases.map(x => [x.date, x.amountSats]),
    [['2030-01-01', 12000], ['2031-01-01', 13000]]);
  assert.equal(plan.totalSats, 25000);
  assert.equal(plan.signingAuthorized, false);
  assert.equal(plan.fundingAuthorized, false);
  assert.equal(plan.broadcastAuthorized, false);
});
test('Bridge rejects uncompleted wizard, invalid dates, and amount mismatch', () => {
  const a=valid(); a.navigationState.currentStep='start';
  assert.throws(() => snapshotRetailGiftPlan(a));
  const b=valid(); b.scheduleRows[0].date='not-a-date';
  assert.throws(() => snapshotRetailGiftPlan(b));
  const c=valid(); c.btcAmount=0.00026;
  assert.throws(() => snapshotRetailGiftPlan(c));
});
test('Bridge rejects dust and unsorted release dates', () => {
  const a=valid();a.hasDustGiftOutputs=()=>true;
  assert.throws(() => snapshotRetailGiftPlan(a));
  const b=valid();b.scheduleRows.reverse();
  assert.throws(() => snapshotRetailGiftPlan(b));
});
test('Isolated Retail mirror and Jade creator have explicit handoff wiring', () => {
  const mirror=readFileSync(new URL('./retail-mirror/index.html',import.meta.url),'utf8');
  const creator=readFileSync(new URL('./professional-creator-prototype.html',import.meta.url),'utf8');
  assert.match(mirror,/bc1q21:professional-plan-ready/);
  assert.ok(mirror.includes("from '../Professional/retail-plan-bridge.mjs'"));
  assert.match(mirror,/bc1q21ProfessionalAcceptRetailPlan/);
  assert.match(creator,/window\.bc1q21ProfessionalAcceptRetailPlan/);
  assert.match(creator,/renderCreatorHeights\(\)/);
  assert.match(mirror,/Retail recovery and funding are disabled/);
});

test('Duplicate dates are rejected', () => {
 const wizard=valid();
 wizard.scheduleRows[1].date=wizard.scheduleRows[0].date;
 assert.throws(() => snapshotRetailGiftPlan(wizard));
});

test('Creator inline JavaScript parses and import is complete', async () => {
 const { Script } = await import('node:vm');
 const creator=readFileSync(new URL('./professional-creator-prototype.html',import.meta.url),'utf8');
 const inline=[...creator.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 assert.ok(inline.length>0);
 for(const source of inline) assert.doesNotThrow(()=>new Script(source));
 assert.match(creator,/window\.bc1q21ProfessionalAcceptRetailPlan\s*=\s*function/);
 assert.match(creator,/showStage\('jade'\)/);
});
