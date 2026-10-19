// Build a standalone gift-specific Professional Option B recipient HTML file.
// Usage: node Professional/build-option-b-gift-page.mjs public-gift.json output.html
// Input JSON: { "giftUrl": ".../gift/<address>?interval=month", "published": {
//   "accountXpub": "...", "masterFingerprintHex": "...", "firstDate": "YYYY-MM-DD",
//   "interval": "month", "outputScriptsHex": ["..."] } }
// All input fields are PUBLIC metadata. Never supply recovery words or private keys.
// This tool is offline only; it neither publishes a URL nor makes Bitcoin transactions.
import {readFileSync,writeFileSync} from 'node:fs';
import {renderOptionBRecipientPage} from './render-option-b-recipient-page.mjs';

const [inputPath,outputPath]=process.argv.slice(2);
if(!inputPath||!outputPath||process.argv.length!==4)
 throw Error('Usage: node Professional/build-option-b-gift-page.mjs public-gift.json output.html');
if(!outputPath.toLowerCase().endsWith('.html'))throw Error('Output must be .html');
const input=JSON.parse(readFileSync(inputPath,'utf8'));
if(!input||typeof input!=='object'||Array.isArray(input)||
 Object.keys(input).sort().join(',')!=='giftUrl,published')
 throw Error('Expected giftUrl and published public metadata only');
const html=renderOptionBRecipientPage(input.giftUrl,input.published);
writeFileSync(outputPath,html,{flag:'wx',mode:0o600});
console.log('Built isolated Professional Option B gift page; no deployment or signing performed');
