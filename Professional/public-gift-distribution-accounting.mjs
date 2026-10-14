// Public-only accounting for a synthetic Professional gift distribution.
// This is NOT a transaction builder, signer, or network client.
import {validatePublicExchangeEnvelope} from './public-exchange-envelope.mjs';

export function reconcilePublicGiftDistribution(envelope, fundingInputSats) {
  const verified = validatePublicExchangeEnvelope(envelope);
  if (verified.operation !== 'gift-distribution')
    throw new Error('Expected gift-distribution operation');
  if (!Array.isArray(fundingInputSats) || fundingInputSats.length < 1 ||
      fundingInputSats.length > 200 ||
      !fundingInputSats.every(n => Number.isSafeInteger(n) && n > 0))
    throw new Error('Invalid public funding amounts');
  const sum = values => values.reduce((total, n) => {
    const next = total + n;
    if (!Number.isSafeInteger(next)) throw new Error('Amount overflow');
    return next;
  }, 0);
  const p = verified.publicPayload;
  const inputsSats = sum(fundingInputSats);
  const giftSats = sum(p.giftOutputs.map(o => o.valueSats));
  const serviceFeeSats = p.serviceFeeOutput.valueSats;
  const changeSats = p.changeOutput === null ? 0 : p.changeOutput.valueSats;
  const outputsSats = sum([giftSats, serviceFeeSats, changeSats]);
  if (inputsSats !== sum([outputsSats, p.minerFeeSats]))
    throw new Error('Funding amounts do not balance with retail gift outputs and fee');
  return Object.freeze({
    giftReference:verified.giftReference,
    giftSats,serviceFeeSats,changeSats,minerFeeSats:p.minerFeeSats,
    inputsSats,outputsSats,releaseCount:p.giftOutputs.length,
    orderedGiftOutputs:p.giftOutputs,
    signingReady:false,broadcast:false
  });
}
