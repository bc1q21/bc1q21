// Execute the generated HTML inline script in a browser-like VM with DOM stubs.
// This catches missing browser globals before distributing an artifact.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html = readFileSync('Professional/synthetic-jade-signed-qr-receiver.html','utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length,2,'Expected fixture JSON and one self-contained bundle');
const ids = ['fixture','status','download','summary','start','stop','reset','video','canvas'];
const nodes = Object.fromEntries(ids.map(id=>[id,{textContent:'',hidden:false,disabled:false,removeAttribute(){},getContext(){return {drawImage(){},getImageData(){return {data:new Uint8ClampedArray(4)}}}},addEventListener(){}}]));
const fixtureMatch=html.match(/<script type="application\/json" id="fixture">([\s\S]*?)<\/script>/);
assert.ok(fixtureMatch,'Fixture JSON missing');
nodes.fixture.textContent=fixtureMatch[1];
const context={document:{getElementById:id=>nodes[id]},console,Buffer:undefined,Uint8Array,Uint8ClampedArray,DataView,ArrayBuffer,TextEncoder,TextDecoder,setTimeout(){},clearTimeout(){},queueMicrotask,crypto:globalThis.crypto, navigator:{},Blob,URL,atob,btoa};
vm.runInNewContext(scripts[1][1],context,{timeout:5000,filename:'signed-qr-receiver-inline.js'});
assert.equal(typeof nodes.start.onclick,'function','Start camera handler not attached');
assert.match(nodes.status.textContent,/Ready to scan signed QR frames/);
console.log('Offline signed QR receiver initialized and controls attached');
