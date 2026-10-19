// Build an isolated, offline collection of Professional gift-specific pages.
// Each gift entry supplies PUBLIC schedule metadata and an exact gift link.
// This prepares publishable static files but does NOT deploy them or modify retail.
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {giftLocator} from './gift-link-public-candidate.mjs';
import {renderOptionBRecipientPage} from './render-option-b-recipient-page.mjs';

export function buildOptionBPublicPages(gifts,outputDirectory) {
 if(!Array.isArray(gifts)||gifts.length<1||gifts.length>120)throw Error('Invalid public gift count');
 if(typeof outputDirectory!=='string'||!outputDirectory)throw Error('Output directory required');
 if(existsSync(outputDirectory))throw Error('Refusing to overwrite an existing output directory');
 const prepared=[],seen=new Set();
 // Validate every gift before writing anything.
 for(const item of gifts) {
  if(!item||typeof item!=='object'||Array.isArray(item)||
     Object.keys(item).sort().join(',')!=='giftUrl,published')
   throw Error('Only giftUrl and published schedule metadata accepted');
  const locator=giftLocator(item.giftUrl);
  if(seen.has(locator.fundingAddress))throw Error('Duplicate gift locator');
  seen.add(locator.fundingAddress);
  const html=renderOptionBRecipientPage(item.giftUrl,item.published);
  prepared.push({address:locator.fundingAddress,interval:locator.interval,html});
 }
 mkdirSync(outputDirectory,{recursive:false});
 for(const item of prepared) {
  // Static host can map /gift/<address> to /gift/<address>/index.html.
  const giftDir=join(outputDirectory,'gift',item.address);
  mkdirSync(giftDir,{recursive:true});
  writeFileSync(join(giftDir,'index.html'),item.html,{flag:'wx',mode:0o600});
 }
 // A public-only routing manifest allows an offline QR/link audit before hosting.
 // No xpub, fingerprint, wallet secret, seed, or signer metadata is exported.
 const routes=prepared.map(item=>Object.freeze({
  giftAddress:item.address,
  interval:item.interval,
  relativeUrl:'gift/'+item.address+'/?interval='+item.interval,
  outputFile:'gift/'+item.address+'/index.html'
 }));
 writeFileSync(join(outputDirectory,'professional-gift-routes.json'),
  JSON.stringify({format:'bc1q21-professional-option-b-routes-v1',deployed:false,routes},null,2)+'\n',
  {flag:'wx',mode:0o600});
 return Object.freeze({giftCount:prepared.length,addresses:Object.freeze(prepared.map(x=>x.address)),routes:Object.freeze(routes),deployed:false});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [input,output]=process.argv.slice(2);
 if(!input||!output||process.argv.length!==4)throw Error('Usage: node Professional/build-option-b-public-pages.mjs gifts.json NEW_OUTPUT_DIRECTORY');
 const parsed=JSON.parse(readFileSync(input,'utf8'));
 const result=buildOptionBPublicPages(parsed,output);
 console.log('Generated '+result.giftCount+' isolated Professional gift pages. Nothing deployed.');
}
