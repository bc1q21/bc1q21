// bc1q21 Professional — public-only funded distribution intent, isolated prototype.
// This module does NOT sign, derive keys, create a PSBT, authorize a broadcast,
// or touch Retail. It freezes the actual funding outpoints and final outputs
// before the Jade Plus unsigned-PSBT adapter is permitted to proceed.
const fail = message => { throw new Error('Professional distribution intent: ' + message); };
const sats = (value, label, allowZero = false) => {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1))
    fail(label + ' must be an integer number of satoshis');
  return value;
};
const hex = (value, bytes, label) => {
  if (typeof value !== 'string' || !new RegExp('^[0-9a-fA-F]{' + (bytes * 2) + '}$').test(value))
    fail('Invalid ' + label);
  return value.toLowerCase();
};
const sum = values => {
  const result = values.reduce((total, value) => total + value, 0);
  if (!Number.isSafeInteger(result)) fail('Amount overflow');
  return result;
};

// The funding inputs must be observed UTXOs, not estimates from a plan preview.
// The output scripts must already have been derived and independently checked
// against the approved release dates and Jade public-only derivation.
export function snapshotFundedDistributionIntent({ network, plan, utxos, giftOutputs,
  changeOutput = null, serviceFeeOutput = null, networkFeeSats }) {
  if (network !== 'regtest') fail('Regtest only during development');
  if (plan?.format !== 'bc1q21-professional-retail-plan-preview-v1' ||
      plan?.status !== 'UNFUNDED_PREVIEW_NOT_SIGNABLE' ||
      !Array.isArray(plan.releases) || !plan.releases.length ||
      !Number.isSafeInteger(plan.totalSats)) fail('Approved Retail plan snapshot required');
  if (!Array.isArray(utxos) || !utxos.length) fail('Observed funding UTXOs required');
  if (!Array.isArray(giftOutputs) || giftOutputs.length !== plan.releases.length)
    fail('One time-locked output per planned release required');
  const seen = new Set();
  const inputs = utxos.map((input, index) => {
    const txid = hex(input?.txid, 32, 'funding txid');
    const vout = input?.vout;
    if (!Number.isSafeInteger(vout) || vout < 0 || vout > 0xffffffff)
      fail('Invalid funding output index');
    const outpoint = txid + ':' + vout;
    if (seen.has(outpoint)) fail('Duplicate funding UTXO');
    seen.add(outpoint);
    return Object.freeze({
      txid, vout, valueSats: sats(input.valueSats, 'Funding input ' + index),
      scriptPubKeyHex: hex(input.scriptPubKeyHex, input.scriptPubKeyHex?.length / 2,
        'funding scriptPubKey')
    });
  });
  const gifts = giftOutputs.map((output, index) => {
    const release = plan.releases[index];
    if (output?.date !== release.date || output?.valueSats !== release.amountSats)
      fail('Gift output does not match approved date and amount at ' + index);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(output.date))
      fail('Invalid gift date');
    if (!Number.isSafeInteger(output.locktime) || output.locktime < 500000000)
      fail('Expected timestamp CLTV locktime');
    const expectedLocktime = Math.floor(Date.parse(output.date + 'T00:00:00.000Z') / 1000);
    if (!Number.isFinite(expectedLocktime) || output.locktime !== expectedLocktime)
      fail('CLTV locktime does not match release date');
    return Object.freeze({
      date: output.date, locktime: output.locktime,
      valueSats: sats(output.valueSats, 'Gift output'),
      scriptPubKeyHex: hex(output.scriptPubKeyHex, output.scriptPubKeyHex?.length / 2,
        'gift output scriptPubKey')
    });
  });
  const extra = (output, label) => output == null ? null : Object.freeze({
    valueSats: sats(output.valueSats, label),
    scriptPubKeyHex: hex(output.scriptPubKeyHex, output.scriptPubKeyHex?.length / 2,
      label + ' scriptPubKey')
  });
  const change = extra(changeOutput, 'Change');
  const serviceFee = extra(serviceFeeOutput, 'Service fee');
  const fee = sats(networkFeeSats, 'Network fee', true);
  const inputTotalSats = sum(inputs.map(i => i.valueSats));
  const outputTotalSats = sum([...gifts.map(g => g.valueSats),
    ...(change ? [change.valueSats] : []),
    ...(serviceFee ? [serviceFee.valueSats] : [])]);
  if (sum([outputTotalSats, fee]) !== inputTotalSats)
    fail('Funding inputs do not balance final outputs and network fee');
  if (sum(gifts.map(g => g.valueSats)) !== plan.totalSats)
    fail('Planned gift total changed');
  return Object.freeze({
    format: 'bc1q21-professional-funded-distribution-intent-v1',
    network: 'regtest', inputs: Object.freeze(inputs), gifts: Object.freeze(gifts),
    change, serviceFee, networkFeeSats: fee, inputTotalSats, outputTotalSats,
    signed: false, signatureVerified: false, broadcastAuthorized: false,
    nextStep: 'CONSTRUCT_UNSIGNED_PSBT_AND_INDEPENDENTLY_VERIFY_INTENT'
  });
}
