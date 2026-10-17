// Experimental PUBLIC-KEY envelope for bc1q21 Professional. Synthetic fixtures ONLY.
// No Jade integration, no production BIP32 secret, no real gift data.
import assert from 'node:assert/strict';
import {
  randomBytes, createPrivateKey, createPublicKey, generateKeyPairSync,
  diffieHellman, hkdfSync, createCipheriv, createDecipheriv,
  createHash
} from 'node:crypto';

const VERSION='bc1q21-professional-public-recovery-experiment-v1';
const CONTEXT=Buffer.from('bc1q21-professional-recipient-recovery-x25519-aesgcm-v1');
const HEADER=Buffer.from('302e020100300506032b656e04220420','hex');
const hex=b=>Buffer.from(b).toString('hex');
const json=x=>Buffer.from(JSON.stringify(x),'utf8');
function recoveryKeyFromBackup(backup) {
  assert.equal(backup.length,32,'Synthetic 32-byte offline backup required');
  const keyBytes=Buffer.from(hkdfSync('sha256',backup,Buffer.from('bc1q21-pro-synthetic-v1'),Buffer.from('recipient-key-v1'),32));
  const privateKey=createPrivateKey({key:Buffer.concat([HEADER,keyBytes]),format:'der',type:'pkcs8'});
  keyBytes.fill(0);
  return {privateKey,publicKey:createPublicKey(privateKey)};
}
function pubBytes(key){return key.export({format:'der',type:'spki'});}
function publicOnly(key){return Buffer.from(pubBytes(key)).toString('base64');}
function parsePublic(s){
  assert.equal(typeof s,'string');assert.ok(s.length<150);
  const k=createPublicKey({key:Buffer.from(s,'base64'),format:'der',type:'spki'});
  assert.equal(k.asymmetricKeyType,'x25519');
  return k;
}
function scheduleFor(count){
  return Array.from({length:count},(_,i)=>({
    release:i+1,date:new Date(Date.UTC(2034,i,1)).toISOString().slice(0,10),
    amountSats:12000+i*1000,path:"m/84'/0'/0'/1/"+i
  }));
}
function assertSchedule(rows){
  assert.ok(Array.isArray(rows)&&rows.length>=1&&rows.length<=24);
  let previous='';
  rows.forEach((row,i)=>{
    assert.deepEqual(Object.keys(row),['release','date','amountSats','path']);
    assert.equal(row.release,i+1);
    assert.match(row.date,/^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(row.date+'T00:00:00Z').toISOString().slice(0,10),row.date);
    assert.ok(row.date>previous);previous=row.date;
    assert.ok(Number.isSafeInteger(row.amountSats)&&row.amountSats>0);
    assert.equal(row.path,"m/84'/0'/0'/1/"+i);
  });
}
function seal(rows,receiverPublicKey){
  assertSchedule(rows);
  const ephemeral=generateKeyPairSync('x25519');
  const salt=randomBytes(16),nonce=randomBytes(12);
  const recipient=publicOnly(receiverPublicKey);
  const metadata={version:VERSION,network:'regtest',count:rows.length,recipient,ephemeral:publicOnly(ephemeral.publicKey),salt:hex(salt),nonce:hex(nonce)};
  const shared=diffieHellman({privateKey:ephemeral.privateKey,publicKey:receiverPublicKey});
  const key=Buffer.from(hkdfSync('sha256',shared,salt,CONTEXT,32));
  shared.fill(0);
  try{
    const cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(json(metadata));
    const ciphertext=Buffer.concat([cipher.update(json(rows)),cipher.final()]);
    return {...metadata,ciphertext:hex(ciphertext),tag:hex(cipher.getAuthTag())};
  }finally{key.fill(0);}
}
function recover(envelope,backup){
  assert.deepEqual(Object.keys(envelope),['version','network','count','recipient','ephemeral','salt','nonce','ciphertext','tag']);
  assert.equal(envelope.version,VERSION);
  assert.equal(envelope.network,'regtest');
  assert.ok(Number.isInteger(envelope.count)&&envelope.count>=1&&envelope.count<=24);
  const receiver=recoveryKeyFromBackup(backup);
  assert.equal(publicOnly(receiver.publicKey),envelope.recipient,'Recipient mismatch');
  const eph=parsePublic(envelope.ephemeral);
  const salt=Buffer.from(envelope.salt,'hex'),nonce=Buffer.from(envelope.nonce,'hex');
  const ciphertext=Buffer.from(envelope.ciphertext,'hex'),tag=Buffer.from(envelope.tag,'hex');
  assert.equal(salt.length,16);assert.equal(nonce.length,12);assert.equal(tag.length,16);
  const meta={version:envelope.version,network:envelope.network,count:envelope.count,recipient:envelope.recipient,ephemeral:envelope.ephemeral,salt:envelope.salt,nonce:envelope.nonce};
  const shared=diffieHellman({privateKey:receiver.privateKey,publicKey:eph});
  const key=Buffer.from(hkdfSync('sha256',shared,salt,CONTEXT,32));shared.fill(0);
  try{
    const decipher=createDecipheriv('aes-256-gcm',key,nonce);
    decipher.setAAD(json(meta));decipher.setAuthTag(tag);
    const result=JSON.parse(Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8'));
    assertSchedule(result);assert.equal(result.length,envelope.count);
    return result;
  }finally{key.fill(0);}
}
const backup=randomBytes(32),wrongBackup=randomBytes(32);
const receiver=recoveryKeyFromBackup(backup),recipientPublic=publicOnly(receiver.publicKey);
for(const count of [1,4,24]){
  const rows=scheduleFor(count);
  const packageData=seal(rows,parsePublic(recipientPublic));
  assert.deepEqual(recover(packageData,backup),rows);
  assert.throws(()=>recover(packageData,wrongBackup));
  for(const field of ['salt','nonce','ciphertext','tag']){
    const altered={...packageData,[field]:(packageData[field][0]==='0'?'1':'0')+packageData[field].slice(1)};
    assert.throws(()=>recover(altered,backup));
  }
  assert.throws(()=>recover({...packageData,version:'unsupported'},backup));
  assert.throws(()=>recover({...packageData,network:'mainnet'},backup));
  assert.throws(()=>recover({...packageData,count:count+1},backup));
  assert.throws(()=>recover({...packageData,recipient:publicOnly(recoveryKeyFromBackup(wrongBackup).publicKey)},backup));
  assert.throws(()=>recover({...packageData,ephemeral:publicOnly(generateKeyPairSync('x25519').publicKey)},backup));
  for(const k of Object.keys(packageData))assert.ok(!/mnemonic|seed|xprv|privatekey|recoverysecret/i.test(k),'Forbidden secret field');
  console.log('PASS recipient-public-key encryption / offline synthetic backup restore / tamper rejection:',count);
}
backup.fill(0);wrongBackup.fill(0);
console.log('NOT PROVEN: Jade compatibility, recipient key backup UX, true offline devices, retail legacy recovery or production security.');
