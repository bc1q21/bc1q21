// Professional isolated experiment: public-only, disposable Jade V7-derived regtest fixture.
// NO signing, mnemonic, xprv, hardware access, network, or broadcast.
// This extracts the previously recorded PUBLIC key/origin from a committed synthetic PSBT
// regression fixture, rather than inventing or replacing device origin metadata.
import { readFileSync } from 'node:fs';
import bitcoin from 'bitcoinjs-lib';
import assert from 'node:assert/strict';

export function getCapturedJadePublicFixture() {
  const source=readFileSync(new URL('./jade-v7-captured-signed-cltv.check.mjs',import.meta.url),'utf8');
  const match=source.match(/const signed = Buffer\.from\('([A-Za-z0-9+/=]+)', 'base64'\)/);
  if(!match)throw Error('Recorded Jade V7 fixture unavailable');
  const psbt=bitcoin.Psbt.fromBase64(match[1]);
  const input=psbt.data.inputs[0];
  const origins=input.bip32Derivation;
  assert.equal(origins?.length,1,'Expected exactly one public signer origin');
  const origin=origins[0];
  const pubkey=Buffer.from(origin.pubkey).toString('hex');
  assert.equal(pubkey,'032608573c95e22ac1b2fb4094d5fd7c79a3dd8aeacb3293e6b120dc830deeffbd');
  const fingerprint=Buffer.from(origin.masterFingerprint).toString('hex');
  assert.match(fingerprint,/^[0-9a-f]{8}$/);
  const path=origin.path;
  assert.match(path,/^m(?:\/[0-9]+'?)+$/);
  const derivationPath=path.slice(2).split('/').map(piece=>{
    const hardened=piece.endsWith("'");
    const n=Number(hardened?piece.slice(0,-1):piece);
    if(!Number.isSafeInteger(n)||n<0||n>=0x80000000)throw Error('Invalid recorded derivation path');
    return n+(hardened?0x80000000:0);
  });
  return Object.freeze({pubkeyHex:pubkey,masterFingerprintHex:fingerprint,derivationPath,
    source:'captured Jade V7 synthetic PSBT public origin; not freshly device-attested'});
}
