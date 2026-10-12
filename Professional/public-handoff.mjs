// bc1q21 Professional public-only handoff: fixed CLTV template test.
// No seed generation, private keys, network access or broadcasting.
import bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'node:buffer';

const allowed = new Set(['version','network','signerPubkeyHex','locktime','redeemScriptHex','fundingAddress']);
export function verifyProfessionalPublicHandoff(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw Error('Invalid public handoff');
  const keys = Object.keys(payload);
  if (keys.length !== allowed.size || keys.some(k=>!allowed.has(k)))
    throw Error('Unexpected field in public handoff; secrets and extra metadata forbidden');
  if (payload.version !== 1 || payload.network !== 'regtest')
    throw Error('Only isolated regtest public handoff v1 is supported');
  const {signerPubkeyHex,redeemScriptHex,fundingAddress,locktime} = payload;
  if (typeof signerPubkeyHex !== 'string' || !/^(02|03)[0-9a-f]{64}$/i.test(signerPubkeyHex))
    throw Error('Invalid compressed signer public key');
  if (!Number.isSafeInteger(locktime) || locktime < 1 || locktime >= 500000000)
    throw Error('Invalid block-height locktime');
  if (typeof redeemScriptHex !== 'string' || !/^[0-9a-f]+$/i.test(redeemScriptHex))
    throw Error('Invalid redeemScript');
  const pubkey=Buffer.from(signerPubkeyHex,'hex');
  const encoded=bitcoin.script.number.encode(locktime);
  const expected=bitcoin.script.compile([encoded,bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
    bitcoin.opcodes.OP_DROP,pubkey,bitcoin.opcodes.OP_CHECKSIG]);
  const redeem=Buffer.from(redeemScriptHex,'hex');
  if (!redeem.equals(expected)) throw Error('Public handoff script does not match signer and locktime');
  const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
  if (typeof fundingAddress !== 'string' || fundingAddress !== payment.address)
    throw Error('Funding address does not match public CLTV script');
  return Object.freeze({
    network:'regtest',version:1,signerPubkeyHex:pubkey.toString('hex'),
    locktime,redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address,
    fundingScriptPubKeyHex:payment.output.toString('hex'),secretsReceived:false
  });
}
