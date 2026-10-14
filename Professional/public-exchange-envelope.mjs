// bc1q21 Professional: hardware-neutral public exchange shape.
// Contract only: no wallet generation, cryptography, signing or network operations.
const fields = ['operation', 'network', 'giftReference', 'publicPayload'];
const operations = new Set(['gift-public-data', 'gift-distribution', 'gift-unlock', 'gift-release']);
export function validatePublicExchangeEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    throw new Error('Invalid public exchange envelope');
  }
  if (Object.keys(envelope).length !== fields.length ||
      Object.keys(envelope).some(key => !fields.includes(key))) {
    throw new Error('Unexpected public exchange envelope field');
  }
  if (!operations.has(envelope.operation) || envelope.network !== 'regtest') {
    throw new Error('Unsupported operation or network');
  }
  if (typeof envelope.giftReference !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(envelope.giftReference)) {
    throw new Error('Invalid public gift reference');
  }
  if (!envelope.publicPayload || typeof envelope.publicPayload !== 'object' ||
      Array.isArray(envelope.publicPayload)) {
    throw new Error('Invalid public payload');
  }
  return Object.freeze({
    operation: envelope.operation,
    network: envelope.network,
    giftReference: envelope.giftReference.toLowerCase(),
    publicPayload: Object.freeze({...envelope.publicPayload})
  });
}
