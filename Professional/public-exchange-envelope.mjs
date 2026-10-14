// bc1q21 Professional: hardware-neutral public exchange shape.
// Contract only: no wallet generation, cryptography, signing or network operations.
const fields = ['operation', 'network', 'giftReference', 'publicPayload'];
const operations = new Set(['gift-public-data', 'gift-distribution', 'gift-unlock', 'gift-release']);
const secretField = /(?:mnemonic|seed|recoverywords|privatekey|privatewif|wif|passphrase|encryptionsecret|masterkey)/i;
function validatePublicPayload(value, depth = 0) {
  if (value === null) return null;
  if (depth > 12) throw new Error('Public payload nesting limit exceeded');
  if (Array.isArray(value)) {
    if (value.length > 256) throw new Error('Public payload array too large');
    return Object.freeze(value.map(item => validatePublicPayload(item, depth + 1)));
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length > 64) throw new Error('Public payload object too large');
    const result = {};
    for (const key of keys) {
      if (secretField.test(key) || key === '__proto__' || key === 'constructor' || key === 'prototype')
        throw new Error('Forbidden field in public payload');
      result[key] = validatePublicPayload(value[key], depth + 1);
    }
    return Object.freeze(result);
  }
  if (typeof value === 'string' && value.length <= 8192) return value;
  if (typeof value === 'boolean') return value;
  if (Number.isSafeInteger(value) && value >= 0) return value;
  throw new Error('Unsupported public payload value');
}
function validateGiftDistributionPayload(payload) {
  const keys = ['giftOutputs', 'serviceFeeOutput', 'changeOutput', 'minerFeeSats'];
  if (Object.keys(payload).length !== keys.length ||
      Object.keys(payload).some(key => !keys.includes(key)))
    throw new Error('Unexpected gift distribution field');
  const validOutput = output => output && !Array.isArray(output) &&
    Object.keys(output).length === 2 &&
    Object.keys(output).every(key => ['scriptPubKeyHex','valueSats'].includes(key)) &&
    typeof output.scriptPubKeyHex === 'string' &&
    /^(?:[0-9a-f]{2})+$/i.test(output.scriptPubKeyHex) &&
    output.scriptPubKeyHex.length <= 20000 &&
    Number.isSafeInteger(output.valueSats) && output.valueSats >= 0;
  if (!Array.isArray(payload.giftOutputs) || payload.giftOutputs.length < 1 ||
      payload.giftOutputs.length > 120 ||
      !payload.giftOutputs.every(validOutput) ||
      !validOutput(payload.serviceFeeOutput) ||
      (payload.changeOutput !== null && !validOutput(payload.changeOutput)) ||
      !Number.isSafeInteger(payload.minerFeeSats) || payload.minerFeeSats < 0)
    throw new Error('Invalid gift distribution outputs or fee');
}
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
  const safePayload = validatePublicPayload(envelope.publicPayload);
  if (envelope.operation === 'gift-distribution')
    validateGiftDistributionPayload(safePayload);
  return Object.freeze({
    operation: envelope.operation,
    network: envelope.network,
    giftReference: envelope.giftReference.toLowerCase(),
    publicPayload: safePayload
  });
}
