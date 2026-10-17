// bc1q21 Professional: exact DATE ARITHMETIC used by retail recipient
// Frontend/gift/gift-h08.js buildSchedule/addIntervalToDate (2026-10-17).
// This module uses public calendar dates only; no wallet keys or secrets.
import assert from 'node:assert/strict';
const ISO=/^\d{4}-\d{2}-\d{2}$/;
export function retailNextDate(date,interval){
  assert.match(date,ISO);
  assert.ok(interval==='month'||interval==='year');
  const [y,m,d]=date.split('-').map(Number);
  const current=new Date(Date.UTC(y,m-1,d));
  assert.equal(current.toISOString().slice(0,10),date,'Invalid input calendar date');
  const next=interval==='year' ?
   new Date(Date.UTC(current.getUTCFullYear()+1,current.getUTCMonth(),current.getUTCDate())) :
   new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()+1,current.getUTCDate()));
  return next.toISOString().slice(0,10);
}
export function retailSchedule(start,count,interval){
  assert.ok(Number.isInteger(count)&&count>=1&&count<=24);
  const result=[start];
  // Validate first date even for a one-output gift.
  assert.match(start,ISO);
  assert.equal(new Date(start+'T00:00:00Z').toISOString().slice(0,10),start);
  for(let i=1;i<count;i++)result.push(retailNextDate(result.at(-1),interval));
  return result;
}
