import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const dates=['2031-01-15','2031-02-15'];
const handoffs=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({
 accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)
}));
const giftUrl='https://example.invalid/gift/'+handoffs[0].fundingAddress+'?interval=month';
const published={accountXpub,masterFingerprintHex,firstDate:dates[0],interval:'month',outputScriptsHex:handoffs.map(x=>x.fundingScriptPubKeyHex)};
test('offline builder generates verified gift-specific HTML with no spending controls',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bc1q21-option-b-'));
 try {
  const input=join(dir,'public.json'),output=join(dir,'gift.html');
  writeFileSync(input,JSON.stringify({giftUrl,published}));
  const run=spawnSync(process.execPath,['Professional/build-option-b-gift-page.mjs',input,output],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const html=readFileSync(output,'utf8');
  for(const date of dates)assert.ok(html.includes('<td>'+date+'</td>'));
  assert.ok(html.includes(handoffs[0].fundingAddress));
  assert.match(html,/id="sign" disabled/);
  assert.match(html,/connect-src 'none'/);
  assert.doesNotMatch(html,/66,000 disposable/);
  const overwrite=spawnSync(process.execPath,['Professional/build-option-b-gift-page.mjs',input,output],{encoding:'utf8'});
  assert.notEqual(overwrite.status,0,'Refuse accidental overwrite');
 } finally {rmSync(dir,{recursive:true,force:true});}
});
test('offline builder refuses falsified date before writing page',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bc1q21-option-b-reject-'));
 try {
  const input=join(dir,'bad.json'),output=join(dir,'gift.html');
  writeFileSync(input,JSON.stringify({giftUrl,published:{...published,firstDate:'2031-01-16'}}));
  const run=spawnSync(process.execPath,['Professional/build-option-b-gift-page.mjs',input,output],{encoding:'utf8'});
  assert.notEqual(run.status,0);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
