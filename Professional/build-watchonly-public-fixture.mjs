// CI-only fixture assembler. Uses a disposable constant test vector, never a user wallet.
// Writes only account xpub + public locking scripts; no seed or private key fields.
import {HDKey} from '@scure/bip32';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const out=process.argv[2];if(!out)throw Error('Output file required');
const h160=b=>createHash('ripemd160').update(createHash('sha256').update(b).digest()).digest('hex');
const acct=HDKey.fromMasterSeed(Buffer.alloc(32,7)).derive("m/84'/0'/0'");
const descriptors=Array.from({length:24},(_,i)=>{
  const pub=Buffer.from(acct.deriveChild(1).deriveChild(i).publicKey);
  const locktime=500+i*144;let n=locktime;const number=[];
  do{number.push(n%256);n=Math.floor(n/256);}while(n>0);
  if(number[number.length-1]&128)number.push(0);
  const redeem=Buffer.concat([Buffer.from([number.length,...number,0xb1,0x75,33]),pub,Buffer.from([0xac])]);
  return {index:i,path:"m/84'/0'/0'/1/"+i,vout:i+1,sats:12000+i*1000,
    publicKeyHex:pub.toString('hex'),locktime,redeemScriptHex:redeem.toString('hex'),
    scriptPubKey:'a914'+h160(redeem)+'87'};
});
const data={format:'bc1q21-professional-watchonly-review-v1',network:'regtest',
privateKeysIncluded:false,locator:{fundingAddress:'3'+'A'.repeat(33),interval:'year'},
accountXpub:acct.publicExtendedKey,
candidates:[{txid:'bb'.repeat(32),outputs:descriptors.map(d=>({vout:d.vout,sats:d.sats,scriptPubKey:d.scriptPubKey}))}],
descriptors};
writeFileSync(out,JSON.stringify(data,null,2)+'\n');
console.log('PASS generated disposable public-only 24-release gift review fixture');
console.log('LIMIT: synthetic unfunded candidate transaction, not an on-chain gift');
