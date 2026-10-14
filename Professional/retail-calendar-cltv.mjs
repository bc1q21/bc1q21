// Pure public-data conversion matching retail gift-h08.js computeCltvForDate.
// No wallet data, signing, transaction submission, or network access.
export function retailDateToCltvTimestamp(dateISO) {
  if (typeof dateISO !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO))
    throw Error('Invalid ISO calendar date');
  const timestamp = Date.parse(dateISO + 'T00:00:00Z');
  if (!Number.isSafeInteger(timestamp) ||
      new Date(timestamp).toISOString().slice(0,10) !== dateISO)
    throw Error('Invalid calendar date');
  const seconds = timestamp / 1000;
  if (!Number.isSafeInteger(seconds) || seconds < 500000000 || seconds > 0xffffffff)
    throw Error('Calendar date outside supported timestamp CLTV range');
  return seconds;
}
