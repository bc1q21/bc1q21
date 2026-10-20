// Public-only signing key consistency for one regtest gift.
// xpub does not attest hardware ownership, recipient authorization, or seed recovery.
import assert from 'node:assert/strict';
import {HDKey} from '@scure/bip32';
import bitcoin from 'bitcoinjs-lib';
export function auditOneGiftPublicSignerIdentity(fixture,discovery) {
 assert.equal(fixture?.format,'bc1q21-professional-watchonly-review-v1');
 assert.equal(fixture.network,'regtest');
 assert.equal(fixture.privateKeysIncluded,false);
 assert.equal(discovery?.format,'bc1q21-professional-single-regtest-gift-discovery-v1');
 assert.equal(discovery.network,'regtest');
 assert.equal(discovery.fundingInputOriginConfirmed,true);
 assert.equal(fixture.descriptors.length,24);
 assert.equal(discovery.releaseOutputs.length,24);
 const account=HDKey.fromExtendedKey(fixture.accountXpub);
 assert.equal(account.privateKey,null,'Public-only account required');
 const seen=new Set();
 for(const d of fixture.descriptors){
  assert.ok(Number.isSafeInteger(d.index)&&d.index>=0&&d.index<24&&!seen.has(d.index),'Duplicate or invalid child index');
  seen.add(d.index);
  assert.equal(d.path,`m/84'/0'/0'/1/${d.index}`);
  const derived=Buffer.from(account.deriveChild(1).deriveChild(d.index).publicKey);
  assert.equal(derived.toString('hex'),d.publicKeyHex,'Account xpub signer mismatch');
  const redeem=bitcoin.script.compile([bitcoin.script.number.encode(d.locktime),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,derived,bitcoin.opcodes.OP_CHECKSIG]);
  assert.equal(Buffer.from(redeem).toString('hex'),d.redeemScriptHex,'Redeem script mismatch');
  const locking=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest}).output;
  assert.equal(Buffer.from(locking).toString('hex'),d.scriptPubKey,'Funding script mismatch');
  const funded=discovery.releaseOutputs.filter(o=>o.index===d.index);
  assert.equal(funded.length,1,'Unique funded release required');
  assert.equal(funded[0].scriptPubKey,d.scriptPubKey);
  assert.equal(funded[0].sats,d.sats);
  assert.ok(Number.isSafeInteger(funded[0].vout)&&funded[0].vout>=0);
 }
 return Object.freeze({network:'regtest',publicAccountDerivationsMatch:true,releaseCount:24,
  fundingScriptsMatch:true,hardwareXpubAuthenticated:false,recipientAuthenticated:false,
  backupRecoveryVerified:false,canSign:false,canBroadcast:false});
}
