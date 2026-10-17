// Professional isolated first-date-to-funded-script verification.
// Public xpub and disclosed date only; no private keys, seed or AES secrets.
// This test does NOT assert that a date was decrypted by Jade.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HDKey} from '@scure/bip32';

const sha256=x=>createHash('sha256').update(x).digest();
const hash160=x=>createHash('ripemd160').update(sha256(x)).digest('hex');
const fail=reason=>({status:'rejected',authenticated:false,reason});

export function annualSchedule(firstDate,count) {
  assert.match(firstDate,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isInteger(count)&&count>0&&count<=24);
  const [y,m,d]=firstDate.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  assert.equal(date.toISOString().slice(0,10),firstDate);
  assert.ok(y>=2027 && y+count-1<=2105);
  const dates=[];
  for(let i=0;i<count;i++){
    const next=new Date(Date.UTC(y+i,m-1,d));
    assert.equal(next.getUTCDate(),d,'Invalid anniversary date (e.g., leap day)');
    dates.push(next.toISOString().slice(0,10));
  }
  return dates;
}
export function cltvScript(locktime,pubkey){
  assert.ok(Number.isSafeInteger(locktime)&&locktime>=500000000&&locktime<=0xffffffff);
  assert.ok(Buffer.isBuffer(pubkey)&&pubkey.length===33&&(pubkey[0]===2||pubkey[0]===3));
  const digits=[];let value=locktime;
  do{digits.push(value%256);value=Math.floor(value/256)}while(value);
  if(digits.at(-1)&0x80)digits.push(0);
  return Buffer.concat([Buffer.from([digits.length,...digits,0xb1,0x75,33]),pubkey,Buffer.from([0xac])]);
}
export function verifyRecoveredAnnualDate({firstDate,releaseCount,accountXpub,confirmedOutputs}){
  try {
    assert.ok(typeof accountXpub==='string' && accountXpub.startsWith('xpub'));
    assert.ok(Array.isArray(confirmedOutputs) && confirmedOutputs.length===releaseCount);
    const account=HDKey.fromExtendedKey(accountXpub);
    assert.ok(account.publicKey&&!account.privateKey);
    const dates=annualSchedule(firstDate,releaseCount);
    const used=new Set(),verified=[];
    for(let i=0;i<dates.length;i++){
      const locktime=Math.floor(Date.parse(dates[i]+'T00:00:00Z')/1000);
      const pub=Buffer.from(account.deriveChild(1).deriveChild(i).publicKey);
      const scriptPubKey='a914'+hash160(cltvScript(locktime,pub))+'87';
      const matches=confirmedOutputs.filter(o=>o.scriptPubKey===scriptPubKey);
      assert.equal(matches.length,1,'Recovered date does not reproduce a unique funded CLTV output');
      const o=matches[0];
      assert.ok(Number.isSafeInteger(o.sats)&&o.sats>0);
      assert.ok(Number.isInteger(o.vout)&&o.vout>=0&&!used.has(o.vout));
      used.add(o.vout);
      verified.push({index:i,date:dates[i],locktime,vout:o.vout,sats:o.sats});
    }
    assert.equal(used.size,confirmedOutputs.length);
    return {status:'public-schedule-matched',authenticated:false,verified,
       reason:'Recovered date and public xpub reproduce all funded locking scripts; signer provenance and gift ownership are unproven'};
  }catch(e){return fail(e.message);}
}
