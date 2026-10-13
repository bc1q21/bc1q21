// bc1q21 Professional: public-only offline wallet handoff to unsigned release PSBT.
// Synthetic regtest-only engineering fixture. No secrets, network, or broadcast.
import { verifyProfessionalPublicHandoff } from './public-handoff.mjs';
import { buildUnsignedCltvPsbt } from './unsigned-cltv-psbt.mjs';
import { prepareUnsignedPsbtForQr } from './qr-handoff.mjs';

const allowedFunding = new Set(['fundingTxHex','vout','expectedTxid','expectedSats',
  'masterFingerprintHex','derivationPath','destinationScriptHex','destinationSats']);
export function prepareProfessionalReleaseFromPublicHandoff(publicHandoff, funding) {
  const wallet = verifyProfessionalPublicHandoff(publicHandoff);
  if (!funding || typeof funding !== 'object' || Array.isArray(funding) ||
      Object.keys(funding).length !== allowedFunding.size ||
      Object.keys(funding).some(key => !allowedFunding.has(key)))
    throw Error('Only approved public funding details are permitted');
  const unsigned = buildUnsignedCltvPsbt({
    ...funding,
    redeemScriptHex: wallet.redeemScriptHex,
    signerPubkeyHex: wallet.signerPubkeyHex,
    locktime: wallet.locktime
  });
  const signing = prepareUnsignedPsbtForQr(unsigned.psbtBase64, unsigned.summary);
  return Object.freeze({
    network: 'regtest',
    fundingAddress: wallet.fundingAddress,
    fundingScriptPubKeyHex: wallet.fundingScriptPubKeyHex,
    unsignedPsbtBase64: unsigned.psbtBase64,
    transactionSummary: signing.transactionSummary,
    nextEncoder: signing.nextEncoder,
    signed: false,
    broadcast: false
  });
}
