import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {retailDateToCltvTimestamp} from './retail-calendar-cltv.mjs';
import {buildOptionBPublicPages} from './build-option-b-public-pages.mjs';

const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const masterFingerprintHex='e29ac13c';
const dates=['2031-01-15','2031-02-15'];
const handoffs=dates.map((date,childIndex)=>deriveJadePublicCltvHandoff({accountXpub,masterFingerprintHex,childIndex,locktime:retailDateToCltvTimestamp(date)}));
const published={accountXpub,masterFingerprintHex,firstDate:dates[0],interval:'month',outputScriptsHex:handoffs.map(x=>x.fundingScriptPubKeyHex)};
const giftUrl='https://example.invalid/gift/'+handoffs[0].fundingAddress+'?interval=month';
test('Option B generates /gift/<address>/index.html with verified dates',()=>{
 const root=mkdtempSync(join(tmpdir(),'bc1q21-gift-pages-'));
 try{
  const result=buildOptionBPublicPages([{giftUrl,published}],join(root,'public'));
  assert.equal(result.giftCount,1);
  assert.equal(result.deployed,false);
  const manifest=JSON.parse(readFileSync(join(root,'public','professional-gift-routes.json'),'utf8'));
  assert.equal(manifest.deployed,false);
  assert.deepEqual(manifest.routes,[{giftAddress:handoffs[0].fundingAddress,interval:'month',relativeUrl:'gift/'+handoffs[0].fundingAddress+'/?interval=month',outputFile:'gift/'+handoffs[0].fundingAddress+'/index.html'}]);
  assert.ok(!JSON.stringify(manifest).includes(accountXpub));
  assert.ok(!JSON.stringify(manifest).includes(masterFingerprintHex));
  const html=readFileSync(join(root,'public','gift',handoffs[0].fundingAddress,'index.html'),'utf8');
  for(const date of dates)assert.ok(html.includes('<td>'+date+'</td>'));
  assert.match(html,/id="sign" disabled/);
  assert.match(html,/connect-src 'none'/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('Option B rejects mismatched schedule before writing files',()=>{
 const root=mkdtempSync(join(tmpdir(),'bc1q21-gift-reject-'));
 try{
  const output=join(root,'public');
  assert.throws(()=>buildOptionBPublicPages([{giftUrl,published:{...published,firstDate:'2031-01-16'}}],output));
  assert.equal(existsSync(output),false);
  assert.throws(()=>buildOptionBPublicPages([{giftUrl,published},{giftUrl,published}],output));
  assert.equal(existsSync(output),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('Option B generates original funding-address QR route using explicit public script mapping',()=>{
 const root=mkdtempSync(join(tmpdir(),'bc1q21-mapped-pages-'));
 try {
  const fundingAddress='bcrt1q'+'q'.repeat(38);
  const mappedUrl='https://example.invalid/gift/'+fundingAddress+'?interval=month';
  const commitment={fundingAddress,releaseScriptsHex:published.outputScriptsHex};
  const output=join(root,'public');
  const result=buildOptionBPublicPages([{giftUrl:mappedUrl,published,commitment}],output);
  assert.deepEqual(result.addresses,[fundingAddress]);
  const html=readFileSync(join(output,'gift',fundingAddress,'index.html'),'utf8');
  for(const date of dates)assert.ok(html.includes('<td>'+date+'</td>'));
  assert.ok(html.includes('const value="'+fundingAddress+'";'));
  assert.match(html,/id="sign" disabled/);
  const manifest=JSON.parse(readFileSync(join(output,'professional-gift-routes.json'),'utf8'));
  assert.equal(manifest.routes[0].giftAddress,fundingAddress);
  assert.ok(!JSON.stringify(manifest).includes(accountXpub));
 } finally {rmSync(root,{recursive:true,force:true});}
});
test('Option B rejects forged funding locator mapping before writing',()=>{
 const root=mkdtempSync(join(tmpdir(),'bc1q21-mapped-reject-'));
 try {
  const fundingAddress='bcrt1q'+'q'.repeat(38);
  const mappedUrl='https://example.invalid/gift/'+fundingAddress+'?interval=month';
  const output=join(root,'public');
  assert.throws(()=>buildOptionBPublicPages([{giftUrl:mappedUrl,published,
   commitment:{fundingAddress:handoffs[0].fundingAddress,releaseScriptsHex:published.outputScriptsHex}}],output),/disagree/);
  assert.equal(existsSync(output),false);
 } finally {rmSync(root,{recursive:true,force:true});}
});
