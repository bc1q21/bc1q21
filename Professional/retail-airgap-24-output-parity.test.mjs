import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {secp256k1} from '@noble/curves/secp256k1';
import {deriveJadePublicCltvHandoff} from './jade-xpub-cltv-handoff.mjs';
import {encodeRetailCltvScript} from './retail-cltv-script-parity.mjs';
import {createHash} from 'node:crypto';

const xpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
let value=0n;for(const ch of xpub)value=value*58n+BigInt(alphabet.indexOf(ch));
let encoded=value.toString(16);if(encoded.length%2)encoded='0'+encoded;
const accountBytes=Buffer.from(encoded,'hex');
assert.equal(accountBytes.length,82);
const root={chain:accountBytes.subarray(13,45),pub:accountBytes.subarray(45,78)};
function derive(node,index){
 const n=Buffer.alloc(4);n.writeUInt32BE(index);
 const mac=createHmac('sha512',node.chain).update(Buffer.concat([node.pub,n])).digest();
 const tweak=BigInt('0x'+mac.subarray(0,32).toString('hex'));
 const point=secp256k1.ProjectivePoint.BASE.multiply(tweak).add(secp256k1.ProjectivePoint.fromHex(node.pub));
 return {pub:Buffer.from(point.toRawBytes(true)),chain:mac.subarray(32)};
}
const hash160=b=>createHash('ripemd160').update(createHash('sha256').update(b).digest()).digest('hex');

test('24 public Jade-derived CLTV outputs match retail scripts independently',()=>{
 assert.equal(accountBytes.readUInt32BE(0),0x0488b21e);
 const seen=new Set();
 for(let index=0;index<24;index++){
  const locktime=Math.floor(Date.UTC(2027+index,0,1)/1000);
  const key=derive(derive(root,1),index);
  const pubkey=key.pub.toString('hex');
  const retailScript=encodeRetailCltvScript(locktime,pubkey);
  const pro=deriveJadePublicCltvHandoff({accountXpub:xpub,masterFingerprintHex:'e29ac13c',childIndex:index,locktime});
  assert.equal(pro.signerPubkeyHex,pubkey);
  assert.equal(pro.redeemScriptHex,retailScript);
  const scriptPubKey='a914'+hash160(Buffer.from(retailScript,'hex'))+'87';
  assert.equal(pro.fundingScriptPubKeyHex,scriptPubKey);
  assert.ok(!seen.has(scriptPubKey),'Each output must have its own script');
  seen.add(scriptPubKey);
 }
 assert.equal(seen.size,24);
});
