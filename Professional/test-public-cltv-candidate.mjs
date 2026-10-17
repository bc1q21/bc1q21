import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyGiftPublicCandidate} from './verify-public-cltv-candidate.mjs';
const h160=s=>createHash('ripemd160').update(createHash('sha256').update(s).digest()).digest('hex');
function fixture(count){
 const pub='02'+'11'.repeat(32);
 const ds=Array.from({length:count},(_,i)=>{
  const lock=130+i*10;
  const num=Buffer.from([lock,0]); // minimal positive script number for 130+
  const redeem=Buffer.concat([Buffer.from([num.length]),num,Buffer.from('b17521','hex'),Buffer.from(pub,'hex'),Buffer.from([0xac])]);
  return {index:i,path:"m/84'/0'/0'/1/"+i,vout:i+1,sats:12000+i*1000,publicKeyHex:pub,
    locktime:lock,redeemScriptHex:redeem.toString('hex'),scriptPubKey:'a914'+h160(redeem)+'87'};
 });
 const tx={txid:'ab'.repeat(32),outputs:ds.map(d=>({vout:d.vout,sats:d.sats,scriptPubKey:d.scriptPubKey}))};
 return {tx,ds};
}
const locator={fundingAddress:'3'+'A'.repeat(33)};
for(const n of [1,4,24]){
 const {tx,ds}=fixture(n);
 const accepted=verifyGiftPublicCandidate(locator,[tx],ds);
 assert.equal(accepted.status,'public-outputs-matched'); assert.equal(accepted.authenticated,false);
 assert.equal(accepted.matches.length,n);
 assert.equal(verifyGiftPublicCandidate(locator,[],ds).status,'rejected');
 assert.equal(verifyGiftPublicCandidate(locator,[tx,tx],ds).status,'rejected');
 const duplicate=structuredClone(ds);duplicate.at(-1).vout=duplicate[0].vout;
 if(n>1)assert.equal(verifyGiftPublicCandidate(locator,[tx],duplicate).status,'rejected');
 for(const [field,value] of [
  ['sats',ds[0].sats+1],['publicKeyHex','03'+'11'.repeat(32)],
  ['locktime',ds[0].locktime+1],['path',"m/44'/0'/0'/0/0"],
  ['redeemScriptHex','deadbeef']]){
  const bad=structuredClone(ds);bad[0][field]=value;
  assert.equal(verifyGiftPublicCandidate(locator,[tx],bad).status,'rejected',field+' must reject');
 }
 const shifted=structuredClone(tx);shifted.outputs[0].scriptPubKey='a914'+'ee'.repeat(20)+'87';
 assert.equal(verifyGiftPublicCandidate(locator,[shifted],ds).status,'rejected');
 const altered=structuredClone(tx);altered.outputs[0].sats++;
 assert.equal(verifyGiftPublicCandidate(locator,[altered],ds).status,'rejected');
 console.log('PASS synthetic public descriptor / P2SH-CLTV funding binding with fail-closed cases:',n);
}
console.log('NOT PROVEN: gift-card link provenance, wallet-owned xpub derivation, encrypted schedule recovery, actual chain integration.');
