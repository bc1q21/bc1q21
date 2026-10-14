import test from 'node:test';
import assert from 'node:assert/strict';
import bitcoin from 'bitcoinjs-lib';
import {buildPublicDeviceComparisonVectors} from './public-device-comparison-vectors.mjs';
const accountXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZg78';
const fixtureXpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const args=()=>({accountXpub:fixtureXpub,masterFingerprintHex:'e29ac13c',
 releaseDates:['2031-01-15','2031-02-15','2031-03-15','2031-04-15']});
test('produces four hardware-neutral public comparison vectors with exact P2SH script hashes',()=>{
 const r=buildPublicDeviceComparisonVectors(args());
 assert.equal(r.deviceCompatibilityVerified,false);
 assert.equal(r.walletOriginAttested,false);
 assert.equal(r.releases.length,4);
 assert.equal(new Set(r.releases.map(x=>x.fundingAddress)).size,4);
 r.releases.forEach((x,i)=>{
   assert.equal(x.derivationPath,`m/84'/0'/0'/1/${i}`);
   const expected=bitcoin.payments.p2sh({redeem:{output:Buffer.from(x.redeemScriptHex,'hex')},
      network:bitcoin.networks.regtest});
   assert.equal(x.fundingScriptPubKeyHex,expected.output.toString('hex'));
   assert.equal(x.fundingAddress,expected.address);
 });
});
test('rejects duplicate dates and private account input',()=>{
 assert.throws(()=>buildPublicDeviceComparisonVectors({...args(),releaseDates:['2031-01-15','2031-01-15']}),/duplicate/);
 assert.throws(()=>buildPublicDeviceComparisonVectors({...args(),accountXpub:'xprv'+fixtureXpub.slice(4)}));
});
