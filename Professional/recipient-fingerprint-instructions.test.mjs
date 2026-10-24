import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('recipient instructions remain explicit and non-authorizing',()=>{
 const source=readFileSync(new URL('./render-option-b-recipient-page.mjs',import.meta.url),'utf8');
 assert.match(source,/independently retained message/);
 assert.match(source,/does not prove who sent/);
 assert.match(source,/cannot check the fingerprint/);
});
