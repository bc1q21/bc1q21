import test from 'node:test';
import assert from 'node:assert/strict';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';

test('calendar date converts to timestamp CLTV, never height CLTV',()=>{
 const seconds=retailDateToCltvTimestamp('2030-01-01');
 assert.equal(seconds,1893456000);
 assert.ok(seconds>=500000000);
 assert.equal(new Date(seconds*1000).toISOString(),'2030-01-01T00:00:00.000Z');
});

test('leap day and adjacent calendar dates use UTC midnight consistently',()=>{
 const leap=retailDateToCltvTimestamp('2028-02-29');
 assert.equal(leap-retailDateToCltvTimestamp('2028-02-28'),86400);
 assert.equal(retailDateToCltvTimestamp('2028-03-01')-leap,86400);
});

test('calendar conversion rejects impossible dates and noncanonical formats',()=>{
 for(const invalid of ['2027-02-29','2030-13-01','2030-00-01',
  '2030-04-31','2030-1-01','2030-01-1','2030-01-01T00:00:00Z',
  'not-a-date','',null,undefined,0]) {
  assert.throws(()=>retailDateToCltvTimestamp(invalid));
 }
});

test('calendar conversion rejects dates outside supported timestamp CLTV range',()=>{
 for(const invalid of ['1970-01-01','1985-11-04','2200-01-01']) {
  assert.throws(()=>retailDateToCltvTimestamp(invalid));
 }
});
