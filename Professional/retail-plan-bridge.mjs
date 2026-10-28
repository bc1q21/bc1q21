// Read-only bridge from the existing Retail planner to Professional's public-only workflow.
// No keys, transactions, network access, funding or signing occur here.
export function snapshotRetailGiftPlan(wizard) {
  if (!wizard || wizard.navigationState?.currentStep !== 'finish_schedule') {
    throw new Error('Complete Retail gift planning before continuing to Jade.');
  }
  const rows = wizard.scheduleRows;
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 60) {
    throw new Error('Invalid Retail release count.');
  }
  const releases = rows.map((row, index) => {
    const date = row?.date;
    const btc = Number(row?.btc);
    const sats = Math.round(btc * 100000000);
    if (typeof date !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) ||
        !Number.isFinite(btc) || !Number.isSafeInteger(sats) || sats <= 0 ||
        Math.abs(btc * 100000000 - sats) > 0.00001 ||
        !wizard.schedulePlanner?.isValidReleaseDate(date)) {
      throw new Error('Invalid Retail release at position ' + (index + 1));
    }
    return Object.freeze({ date, amountSats: sats });
  });
  for (let i = 1; i < releases.length; i++) {
    if (releases[i].date <= releases[i - 1].date) {
      throw new Error('Retail release dates must be ordered.');
    }
  }
  if (wizard.hasDustGiftOutputs?.()) {
    throw new Error('Retail gift contains an output below the dust threshold.');
  }
  const totalSats = releases.reduce((sum, release) => sum + release.amountSats, 0);
  const expected = Math.round(Number(wizard.btcAmount) * 100000000);
  if (!Number.isSafeInteger(totalSats) || totalSats !== expected) {
    throw new Error('Retail release amounts do not match the gift total.');
  }
  return Object.freeze({
    format: 'bc1q21-professional-retail-plan-preview-v1',
    status: 'UNFUNDED_PREVIEW_NOT_SIGNABLE',
    releases: Object.freeze(releases),
    totalSats,
    signingAuthorized: false,
    fundingAuthorized: false,
    broadcastAuthorized: false
  });
}
