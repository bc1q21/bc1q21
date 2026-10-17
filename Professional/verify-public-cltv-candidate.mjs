// Isolated Professional PUBLIC-ONLY candidate-to-descriptor verifier.
// No mnemonic, private key, RPC, signing, broadcast or trust in URL alone.
// A descriptor supplied by an untrusted source is NOT authentication of gift ownership.
import assert from 'node:assert/strict';
import {createHash,timingSafeEqual} from 'node:crypto';
const sha256=x=>createHash('sha256').update(x).digest();
const hash160=x=>createHash('ripemd160').update(sha256(x)).digest();
const isHex=(s,n)=>typeof s==='string' && new RegExp('^[0-9a-f]{'+n+'}$').test(s);
const fail=(message)=>({status:'rejected',reason:message,authenticated:false});
const expectInt=(n)=>Number.isSafeInteger(n)&&n>=0;

function parseCLTV(redeemHex) {
  assert.ok(typeof redeemHex==='string'&&/^[0-9a-f]+$/.test(redeemHex));
  const s=Buffer.from(redeemHex,'hex');
  assert.ok(s.length>=40&&s.length<=45,'Unsupported CLTV script length');
  const n=s[0];
  assert.ok(n>=1&&n<=5,'Unsupported CLTV number push');
  assert.equal(s.length,1+n+2+1+33+1,'Unexpected CLTV script template');
  const encoded=s.subarray(1,1+n);
  assert.equal(s[1+n],0xb1,'Missing OP_CHECKLOCKTIMEVERIFY');
  assert.equal(s[2+n],0x75,'Missing OP_DROP');
  assert.equal(s[3+n],33,'Wrong public-key push');
  const pub=s.subarray(4+n,4+n+33);
  assert.ok(pub[0]===2||pub[0]===3,'Invalid compressed key prefix');
  assert.equal(s[s.length-1],0xac,'Missing OP_CHECKSIG');
  assert.ok(!(encoded.at(-1)&0x80),'Negative CLTV number');
  assert.ok(!(n>1&&encoded.at(-1)===0&&!(encoded.at(-2)&0x80)),'Nonminimal CLTV number');
  const locktime=Number(encoded.readUIntLE(0,n));
  assert.ok(Number.isSafeInteger(locktime)&&locktime>=1);
  return {scriptPubKey:'a914'+hash160(s).toString('hex')+'87',locktime,publicKeyHex:pub.toString('hex')};
}
export function verifyGiftPublicCandidate(locator,candidates,descriptors) {
  assert.ok(locator&&typeof locator.fundingAddress==='string');
  if(!Array.isArray(candidates)||!Array.isArray(descriptors))
    return fail('Missing public candidate or descriptors');
  if(candidates.length!==1) return fail(candidates.length?'Ambiguous candidate transactions':'No candidate');
  if(!descriptors.length||descriptors.length>24) return fail('Unsupported number of releases');
  const tx=candidates[0];
  if(!isHex(tx?.txid,64)||!Array.isArray(tx?.outputs)||tx.outputs.length!==descriptors.length)
    return fail('Candidate or output count mismatch');
  const used=new Set(),matches=[];
  try {
    for(const [i,d] of descriptors.entries()) {
      assert.equal(d.index,i,'Non-sequential derivation index');
      assert.equal(d.path,"m/84'/0'/0'/1/"+i,'Incorrect public derivation path');
      assert.ok(expectInt(d.vout),'Invalid output index');
      assert.ok(expectInt(d.sats)&&d.sats>0,'Invalid amount');
      assert.ok(isHex(d.publicKeyHex,66),'Invalid public key');
      const parsed=parseCLTV(d.redeemScriptHex);
      assert.equal(parsed.publicKeyHex,d.publicKeyHex,'Redeem pubkey does not match descriptor');
      assert.equal(parsed.locktime,d.locktime,'Wrong script locktime');
      assert.ok(!used.has(d.vout),'Repeated output index');
      used.add(d.vout);
      const out=tx.outputs.find(o=>o.vout===d.vout);
      assert.ok(out,'Missing expected output');
      assert.equal(out.sats,d.sats,'Funding amount mismatch');
      assert.equal(out.scriptPubKey,parsed.scriptPubKey,'P2SH script commitment mismatch');
      matches.push({index:i,txid:tx.txid,vout:d.vout,locktime:d.locktime,sats:d.sats,scriptPubKey:parsed.scriptPubKey});
    }
    assert.equal(used.size,tx.outputs.length);
    return {status:'public-outputs-matched',authenticated:false,
      reason:'Scripts and outputs match supplied public descriptors; origin, gift link ownership and recovered schedule remain unverified',matches};
  } catch(e) { return fail(e.message); }
}
