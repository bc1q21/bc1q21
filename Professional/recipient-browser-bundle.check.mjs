// Integration gate: Professional recipient camera + verifier + finalizer must
// actually bundle for a browser. Node-only tests cannot prove this.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
test('recipient Jade camera-to-finalizer bundles for a browser',async()=>{
 const result=await build({entryPoints:['Professional/recipient-jade-signed-release.browser.mjs'],bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',logLevel:'silent',
  define:{'process.env.NODE_ENV':'"production"','process.browser':'true'},
  inject:['Professional/browser-process-shim.cjs','Professional/browser-buffer-shim.cjs']});
 assert.ok(result.outputFiles[0].contents.length>1000);
});
