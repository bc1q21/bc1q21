import assert from 'node:assert/strict';
import {retailNextDate,retailSchedule} from './retail-date-policy-reference.mjs';
// Retail uses Date.UTC overflow normalization, not calendar-day clamping.
assert.deepEqual(retailSchedule('2032-02-29',4,'year'),
 ['2032-02-29','2033-03-01','2034-03-01','2035-03-01']);
assert.deepEqual(retailSchedule('2031-01-31',4,'month'),
 ['2031-01-31','2031-03-03','2031-04-03','2031-05-03']);
assert.deepEqual(retailSchedule('2031-12-31',3,'month'),
 ['2031-12-31','2032-01-31','2032-03-02']);
assert.deepEqual(retailSchedule('2031-05-17',4,'year'),
 ['2031-05-17','2032-05-17','2033-05-17','2034-05-17']);
assert.equal(retailNextDate('2032-02-29','year'),'2033-03-01');
assert.equal(retailNextDate('2031-01-31','month'),'2031-03-03');
for(const date of ['2031-02-30','bad-date','2031-13-01'])assert.throws(()=>retailSchedule(date,1,'year'));
assert.throws(()=>retailSchedule('2031-05-17',25,'year'));
assert.throws(()=>retailSchedule('2031-05-17',0,'month'));
assert.throws(()=>retailSchedule('2031-05-17',2,'fortnight'));
console.log('PASS retail calendar rollover fixtures for February 29, January 31 and year boundary');
console.log('COMPATIBILITY DIFFERENCE: the earlier Professional annualSchedule rejected leap-day anniversaries; retail rolls them to March 1');
console.log('NOT PROVEN: creator schedule policy versus recipient discovery for all existing gift formats');
