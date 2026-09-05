let GIFT_HELP_URL = 'https://youtu.be/WcSpTlghGUc';
const CLAIM_FEE_RATE_FALLBACK_SAT_VB = 2;
const CLAIM_RBF_SEQUENCE = 0xfffffffd;

function selectClaimFeeRate(feeEstimate) {
  const liveRate = Number(feeEstimate?.normal?.sat_vb);
  return feeEstimate?.success && Number.isFinite(liveRate) && liveRate > 0
    ? Math.ceil(liveRate)
    : CLAIM_FEE_RATE_FALLBACK_SAT_VB;
}

    function recipientPage() {
      return {
        // ---- Config ----
helpUrl: GIFT_HELP_URL,
        baseApi: '/bitcoin',
        //baseApi: 'http://127.0.0.1:8000/bitcoin',

        // interval: default month; override via ?interval=year
        interval: 'month',

        // ---- UI State ----
        loading: false,
        error: '',
        notice: '',

        // ---- Gift identity ----
        fundingAddress: '',
txs: [],
giftTxCandidates: [],
giftTx: null,

        // ---- From chain ----
        createdAt: null,
        createdAtBlock: null,
        opReturnCipherHex: '',

        timelockedOutputs: [], // [{address, sats, voutN}]
        rows: [],
        totalBTC: 0,
        creationPriceUSD: null,
        creationPriceTime: null,
        priceHistory: [],

        // ---- Unlock / keys ----
        mnemonic: '',
        canTryUnlock: false,
        unlocked: false,
        releaseAddress: '',
        aesKeyAddress: '',
        firstReleaseDateISO: '',
        cryptoManager: null,
          cltvKeyMode: '',
        readyCount: 0,
        releaseTxHex: '',
        releaseTxid: '',
        utxoCache: new Map(),

        async init() {
          try {
              const configResponse = await fetch('../content-config.json', { cache: 'no-store' });
if (!configResponse.ok) {
  throw new Error('Unable to load bc1q21 content configuration.');
}

const contentConfig = await configResponse.json();

if (contentConfig && typeof contentConfig.giftHelpUrl === 'string' && contentConfig.giftHelpUrl.trim()) {
  GIFT_HELP_URL = contentConfig.giftHelpUrl.trim();
    this.helpUrl = GIFT_HELP_URL;
}
            // address from:
            // - /gift/<address>  (recommended)
            // - or ?a=<address>
            const parts = window.location.pathname.split('/').filter(Boolean);
            const last = parts[parts.length - 1] || '';
            const qs = new URLSearchParams(window.location.search);

            this.fundingAddress = (qs.get('a') || qs.get('address') || last || '').trim();
            if (!this.fundingAddress) {
              this.error = 'Missing funding address in URL. Use /gift/<address> or ?a=<address>.';
              return;
            }

            this.interval = (qs.get('interval') || 'month').toLowerCase() === 'year' ? 'year' : 'month';

            await this.loadGiftFromAddressTxs();
          } catch (e) {
            this.error = e?.message || String(e);
          }
        },

        async loadGiftFromAddressTxs() {
          this.loading = true;
          this.error = '';
          this.notice = '';

          try {
            const url = `${this.baseApi}/address/${this.fundingAddress}/txs`;
            const txs = await fetch(url).then(r => r.json());
            this.txs = Array.isArray(txs) ? txs : [];

            // Collect all transactions that could be the gift creation transaction.
// Do not trust transaction ordering; the correct candidate will be
// validated against the recipient's recovery words during unlock.
this.giftTxCandidates = this.txs.filter(tx => {
  const vout = tx?.vout || [];
  const hasOpReturn = vout.some(o => o?.scriptpubkey_type === 'op_return');
  const hasP2sh3 = vout.some(o => (o?.scriptpubkey_address || '').startsWith('3'));
  return hasOpReturn && hasP2sh3;
});

            if (!this.giftTxCandidates.length) {
  this.error = 'Could not find a gift transaction.';
  return;
}

// M-03: do not choose a gift transaction based on upstream ordering.
// Final selection happens during unlock, when the recovery words
// can cryptographically validate the correct candidate.
this.giftTx = null;
this.createdAt = null;
this.createdAtBlock = null;
this.creationPriceUSD = null;
this.creationPriceTime = null;
this.priceHistory = [];
this.timelockedOutputs = [];
this.opReturnCipherHex = '';
this.rows = [];
this.totalBTC = 0;
              // Preserve Edgar's existing pre-unlock gift overview when there is
// exactly one plausible candidate, without authenticating it yet.
if (this.giftTxCandidates.length === 1) {
  const previewTx = this.giftTxCandidates[0];
  const previewStatus = previewTx?.status || {};

  this.createdAt = previewStatus.block_time
    ? new Date(previewStatus.block_time * 1000)
    : new Date();
  this.createdAtBlock = previewStatus.block_height || null;

  const previewPriceList = Array.isArray(previewStatus.price)
    ? previewStatus.price
    : [];
  const previewFirstPrice = previewPriceList.find(
    p => typeof p?.USD === 'number'
  );
  const previewParsedPrice = previewFirstPrice
    ? Number(previewFirstPrice.USD)
    : NaN;

  this.creationPriceUSD = Number.isFinite(previewParsedPrice)
    ? previewParsedPrice
    : null;
  this.creationPriceTime =
    typeof previewFirstPrice?.time === 'number'
      ? previewFirstPrice.time
      : null;
  this.priceHistory = previewPriceList;

  const previewVouts = previewTx?.vout || [];

  this.timelockedOutputs = previewVouts
    .filter(o => (o?.scriptpubkey_address || '').startsWith('3'))
    .map(o => ({
      address: o.scriptpubkey_address,
      sats: Number(o.value) || 0,
      voutN: Number(o.n),
      scriptPubKey: o.scriptpubkey || '',
      spent: Boolean(o.spent)
    }));

  this.buildRowsWithoutSchedule();
}

            // Spend status
            //this can be a heavy operation, let's hold it for now
            //await this.refreshSpentStatuses();

          } finally {
            this.loading = false;
          }
        },

        buildRowsWithoutSchedule() {
          const now = new Date();
          this.rows = this.timelockedOutputs.map((o, i) => {
            const btc = o.sats / 1e8;
            const creationPrice = Number.isFinite(this.creationPriceUSD) ? this.creationPriceUSD : null;
            const usdAtCreation = creationPrice !== null ? btc * creationPrice : NaN;
            return {
              index: i + 1,
              address: o.address,
              sats: o.sats,
              btc,
              scriptPubKey: o.scriptPubKey || '',
              releaseDate: '',
              ready: false,
              pending: false,
              spent: Boolean(o.spent),
              checkedSpent: false,
              usdAtCreation,
              usdAtRelease: NaN
            };
          });

          this.totalBTC = this.rows.reduce((s, r) => s + r.btc, 0);
        },

        onMnemonicChanged() {
          this.mnemonic = this.sanitizeMnemonic(this.mnemonic);
          const words = (this.mnemonic || '').split(' ').filter(Boolean);
          this.canTryUnlock = words.length === 12;
          this.error = '';
          this.notice = '';
        },

        async inspectGiftCandidate(tx, cm) {
  const vouts = tx?.vout || [];

  const timeLocked = vouts
    .filter(o => (o?.scriptpubkey_address || '').startsWith('3'))
    .map(o => ({
      address: o.scriptpubkey_address,
      sats: Number(o.value) || 0,
      voutN: Number(o.n),
      scriptPubKey: o.scriptpubkey || '',
      spent: Boolean(o.spent)
    }));

  if (!timeLocked.length) return null;

  const op = vouts.find(o => o?.scriptpubkey_type === 'op_return');
  const asm = op?.scriptpubkey_asm || '';
  const asmParts = asm.split(' ').map(s => s.trim()).filter(Boolean);
  const opReturnCipherHex = asmParts[asmParts.length - 1] || '';

  if (!/^[0-9a-fA-F]+$/.test(opReturnCipherHex)) {
    return null;
  }

  let firstDate;

  try {
    firstDate = await window.__decryptShortHex(
      opReturnCipherHex,
      cm.aesKeyAddress || '',
      cm.opReturnEncryptionSecret || ''
    );
  } catch (_) {
    return null;
  }

  if (typeof firstDate !== 'string') {
    return null;
  }

  if (/^[0-9a-fA-F]+$/.test(firstDate) && firstDate.length % 2 === 0) {
    try {
      const bytes = new Uint8Array(
        firstDate.match(/.{1,2}/g).map(b => parseInt(b, 16))
      );
      firstDate = new TextDecoder().decode(bytes).trim();
    } catch (_) {
      return null;
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDate)) {
    return null;
  }

  const parsedDate = new Date(firstDate + 'T00:00:00Z');

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== firstDate
  ) {
    return null;
  }

  const outputAddresses = new Set(timeLocked.map(o => o.address));

  const legacyFirst = await this.computeCltvForDate(firstDate, cm);

  if (outputAddresses.has(legacyFirst.address)) {
    return {
      tx,
      timeLocked,
      opReturnCipherHex,
      firstDate,
      cltvKeyMode: 'legacy'
    };
  }

  const childFirst = await this.computeCltvForDate(firstDate, cm, 0, true);

  if (outputAddresses.has(childFirst.address)) {
    return {
      tx,
      timeLocked,
      opReturnCipherHex,
      firstDate,
      cltvKeyMode: 'per-index'
    };
  }

  return null;
},
          async unlockGift() {
          this.loading = true;
          this.error = '';
          this.notice = '';

          try {
            // 1) derive keys from mnemonic
            const cm = new CryptoManager();
            const sanitizedMnemonic = this.sanitizeMnemonic(this.mnemonic.trim());
            const res = await cm.importMnemonic(sanitizedMnemonic);
            if (!res?.success) throw new Error(res?.error || 'Mnemonic import failed');

            this.cryptoManager = cm;

            if (this.fundingAddress != cm.fundingAddress) {
              throw new Error('The 12 words you provided do not match the current gift address.');
              return;
              this.fundingAddress = cm.fundingAddress;
              loadGiftFromAddressTxs();
            }

            this.releaseAddress = cm.releaseAddress || '';
            this.aesKeyAddress = cm.aesKeyAddress || '';

            if (!this.aesKeyAddress) throw new Error('AES key address (m/84/0/0/0/2) not derived.');

              // M-03: cryptographically validate every plausible gift transaction.
// Do not rely on the order returned by the upstream transaction API.
const validCandidates = [];

for (const candidateTx of this.giftTxCandidates) {
  const inspected = await this.inspectGiftCandidate(candidateTx, cm);

  if (inspected) {
    validCandidates.push(inspected);
  }
}

if (validCandidates.length === 0) {
  throw new Error(
    'No gift transaction matched the recovery words and blockchain contract.'
  );
}

if (validCandidates.length > 1) {
  throw new Error(
    'More than one gift transaction matched. Unable to safely determine the correct gift.'
  );
}

const selectedGift = validCandidates[0];

// Only now commit the validated transaction to page state.
this.giftTx = selectedGift.tx;
this.timelockedOutputs = selectedGift.timeLocked;
this.opReturnCipherHex = selectedGift.opReturnCipherHex;
this.firstReleaseDateISO = selectedGift.firstDate;
this.cltvKeyMode = selectedGift.cltvKeyMode;

// Restore the normal gift metadata from the authenticated transaction.
const selectedStatus = this.giftTx?.status || {};
this.createdAt = selectedStatus.block_time
  ? new Date(selectedStatus.block_time * 1000)
  : new Date();
this.createdAtBlock = selectedStatus.block_height || null;

const selectedPriceList = Array.isArray(selectedStatus.price)
  ? selectedStatus.price
  : [];
const selectedFirstPrice = selectedPriceList.find(
  p => typeof p?.USD === 'number'
);
const selectedParsedPrice = selectedFirstPrice
  ? Number(selectedFirstPrice.USD)
  : NaN;

this.creationPriceUSD = Number.isFinite(selectedParsedPrice)
  ? selectedParsedPrice
  : null;
this.creationPriceTime =
  typeof selectedFirstPrice?.time === 'number'
    ? selectedFirstPrice.time
    : null;
this.priceHistory = selectedPriceList;

this.buildRowsWithoutSchedule();
            // 2) decrypt OP_RETURN to get first release date
            if (!window.__decryptShortHex) throw new Error('AESHelper decryptShortHex not loaded.');
            const currentEncryptionSecret = cm.opReturnEncryptionSecret || '';

let firstDate = await window.__decryptShortHex(
  this.opReturnCipherHex,
  this.aesKeyAddress,
  currentEncryptionSecret
);


            // If decrypt returns hex (like 3230...), convert hex -> UTF-8 text
            if (/^[0-9a-fA-F]+$/.test(firstDate) && firstDate.length % 2 === 0) {
              try {
                const bytes = new Uint8Array(firstDate.match(/.{1,2}/g).map(b => parseInt(b, 16)));
                firstDate = new TextDecoder().decode(bytes).trim();
              } catch (_) {
                // ignore and fall through
              }
            }

            // expect YYYY-MM-DD
            if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDate)) {
              throw new Error(`Decrypted value is not YYYY-MM-DD: ${firstDate}`);
            }

            this.firstReleaseDateISO = firstDate;

            // 3) validate first CLTV address and discover interval (month vs year)
            const outputAddresses = new Set(this.timelockedOutputs.map(o => o.address));

const legacyFirst = await this.computeCltvForDate(firstDate, cm);

if (outputAddresses.has(legacyFirst.address)) {
    this.cltvKeyMode = 'legacy';
} else {
    const childFirst = await this.computeCltvForDate(firstDate, cm, 0, true);

    if (!outputAddresses.has(childFirst.address)) {
        throw new Error('Derived first release address does not match any gift output.');
    }

    this.cltvKeyMode = 'per-index';
}
            const { interval: resolvedInterval, addrMap } = await this.detectIntervalFromOutputs(firstDate, cm);
            this.interval = resolvedInterval;

            this.rows = this.rows.map((r) => {
              const derived = addrMap.get(r.address);
              const releaseDate = derived?.date || '';
              const ready = releaseDate ? this.isReadyForRelease(releaseDate) : false;
              return {
                ...r,
                releaseDate,
                ready,
                validation: derived ? 'match' : 'mismatch',
                redeemScript: derived?.redeemScript || r.redeemScript,
                locktime: derived?.locktime || r.locktime,
                  childIndex: derived?.childIndex ?? r.childIndex ?? null
              };
            });

            const mismatches = this.rows.filter(r => r.validation === 'mismatch').length;
            this.notice = mismatches
              ? `Unlocked, but ${mismatches} output(s) did not match derived addresses.`
              : `Your gift key has been validated.`;

            this.unlocked = true;
            this.updateReadyCount();

            await this.refreshSpentStatuses();
          } catch (e) {
            this.error = e?.message || String(e);
          } finally {
            this.loading = false;
          }
        },

        buildSchedule(startISO, count, interval) {
          const [y, m, d] = startISO.split('-').map(Number);
          let dt = new Date(Date.UTC(y, m - 1, d));
          const out = [];

          for (let i = 0; i < count; i++) {
            out.push(dt.toISOString().slice(0, 10));
            if (interval === 'year') {
              dt = new Date(Date.UTC(dt.getUTCFullYear() + 1, dt.getUTCMonth(), dt.getUTCDate()));
            } else {
              // month
              dt = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()));
            }
          }
          return out;
        },

        sanitizeMnemonic(input) {
          return (input || '')
            .replace(/[^a-zA-Z ]+/g, ' ') // strip non letters except spaces
            .replace(/\s+/g, ' '); // collapse whitespace
            //.trim();
        },

        addIntervalToDate(startISO, interval) {
          const [y, m, d] = startISO.split('-').map(Number);
          const base = new Date(Date.UTC(y, m - 1, d));
          const next = interval === 'year'
            ? new Date(Date.UTC(base.getUTCFullYear() + 1, base.getUTCMonth(), base.getUTCDate()))
            : new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate()));
          return next.toISOString().slice(0, 10);
        },

                async computeCltvForDate(dateISO, cm, childIndex = null, useChildKey = false) {
          const locktime = Math.floor(new Date(dateISO + 'T00:00:00Z').getTime() / 1000);

          let publicKeyHex = cm.publicKeyHex;

          if (useChildKey) {
            const childKey = await cm.deriveCltvChild(childIndex);
            publicKeyHex = childKey.publicKeyHex;
          }

          const script = cm.buildCLTVScript(locktime, publicKeyHex);
          const address = await cm.createP2SHAddress(script);
          const redeemScript = cm.bytesToHex ? cm.bytesToHex(script) : '';

          return {
            address,
            locktime,
            date: dateISO,
            redeemScript,
            childIndex: useChildKey ? Number(childIndex) : null
          };
        },
          
                async detectIntervalFromOutputs(firstDate, cm) {
          const useChildKey = this.cltvKeyMode === 'per-index';

          if (this.timelockedOutputs.length < 2) {
            const cltv = await this.computeCltvForDate(
              firstDate,
              cm,
              0,
              useChildKey
            );
            const addrMap = new Map([[this.timelockedOutputs[0].address, cltv]]);
            return { interval: this.interval, addrMap };
          }

          const outputAddrs = this.timelockedOutputs.map(o => o.address || '');

          // resolvedDates[i] = ISO date string for output i, or null if unknown
          const resolvedDates = new Array(outputAddrs.length).fill(null);
          resolvedDates[0] = firstDate;

          // Try an interval: walk from firstDate using interval, match addresses
          const applyInterval = async (interval) => {
            let date = firstDate;

            for (let i = 1; i < outputAddrs.length; i++) {
              date = this.addIntervalToDate(date, interval);

              const cltv = await this.computeCltvForDate(
                date,
                cm,
                i,
                useChildKey
              );

              if (cltv.address === outputAddrs[i]) {
                resolvedDates[i] = date;
              }
            }
          };

          // Step 1: try monthly — check 2nd output first as a fast gate
          const monthSecond = await this.computeCltvForDate(
            this.addIntervalToDate(firstDate, 'month'),
            cm,
            1,
            useChildKey
          );

          if (monthSecond.address === outputAddrs[1]) {
            await applyInterval('month');
          }

          // Step 2: for any still-unresolved outputs, try yearly
          const unresolvedAfterMonth = resolvedDates.some(
            (d, i) => i > 0 && d === null
          );

          if (unresolvedAfterMonth) {
            const yearSecond = await this.computeCltvForDate(
              this.addIntervalToDate(firstDate, 'year'),
              cm,
              1,
              useChildKey
            );

            if (yearSecond.address === outputAddrs[1] || resolvedDates[1] === null) {
              let date = firstDate;

              for (let i = 1; i < outputAddrs.length; i++) {
                date = this.addIntervalToDate(date, 'year');

                if (resolvedDates[i] === null) {
                  const cltv = await this.computeCltvForDate(
                    date,
                    cm,
                    i,
                    useChildKey
                  );

                  if (cltv.address === outputAddrs[i]) {
                    resolvedDates[i] = date;
                  }
                }
              }
            }
          }

          // Step 3: for any remaining unknowns, walk day-by-day
          for (let i = 1; i < outputAddrs.length; i++) {
            if (resolvedDates[i] !== null) continue;

            let searchFrom = resolvedDates[i - 1];

            for (let j = i - 1; j >= 0 && searchFrom === null; j--) {
              searchFrom = resolvedDates[j];
            }

            if (!searchFrom) continue;

            const [y, m, d] = searchFrom.split('-').map(Number);
            let cursor = new Date(Date.UTC(y, m - 1, d));
            const MAX_DAYS = 366 * 10;

            for (let step = 0; step < MAX_DAYS; step++) {
              cursor = new Date(cursor.getTime() + 86400000);
              const dateISO = cursor.toISOString().slice(0, 10);

              const cltv = await this.computeCltvForDate(
                dateISO,
                cm,
                i,
                useChildKey
              );

              if (cltv.address === outputAddrs[i]) {
                resolvedDates[i] = dateISO;
                break;
              }
            }
          }

          // Derive interval from resolved dates
          const intervals = [];

          for (let i = 1; i < resolvedDates.length; i++) {
            if (resolvedDates[i - 1] && resolvedDates[i]) {
              const prev = new Date(resolvedDates[i - 1] + 'T00:00:00Z');
              const curr = new Date(resolvedDates[i] + 'T00:00:00Z');
              const days = Math.round((curr - prev) / 86400000);
              intervals.push(days >= 300 ? 'year' : 'month');
            }
          }

          const yearCount = intervals.filter(x => x === 'year').length;
          const monthCount = intervals.filter(x => x === 'month').length;

          const dominantInterval =
            yearCount > monthCount
              ? 'year'
              : monthCount > 0
                ? 'month'
                : this.interval;

          // Build addrMap from resolved dates
          const addrMap = new Map();

          for (let i = 0; i < outputAddrs.length; i++) {
            if (resolvedDates[i]) {
              const cltv = await this.computeCltvForDate(
                resolvedDates[i],
                cm,
                i,
                useChildKey
              );

              addrMap.set(outputAddrs[i], cltv);
            }
          }

          return { interval: dominantInterval, addrMap };
        },
          
        async countScheduleMatches(firstDate, interval, cm) {
          const schedule = this.buildSchedule(firstDate, this.timelockedOutputs.length, interval);
          const computed = [];
          for (const d of schedule) {
            computed.push(await this.computeCltvForDate(d, cm));
          }

          const addrSet = new Set(this.timelockedOutputs.map(o => o.address));
          const matches = computed.filter(c => addrSet.has(c.address)).length;

          return { matches, schedule, computed };
        },

        isReadyForRelease(releaseDateISO) {
          // Consider GMT-1 cutoff to align with CLTV median time past buffer
          const now = new Date();
          const cutoff = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours() - 1
          ));
          const rd = new Date(releaseDateISO + 'T00:00:00Z');
          return rd <= cutoff;
        },

        updateReadyCount() {
          let count = 0;
          this.rows = this.rows.map(r => {
            const readyNow = !r.pending && !r.spent && this.isReadyForRelease(r.releaseDate || '');
            if (readyNow && !r.spent) count++;
            return { ...r, ready: readyNow };
          });
          this.readyCount = count;
        },

        async fetchRawTxHex(txid) {
          const url = `${this.baseApi}/tx/${txid}/hex`;
          const res = await fetch(url).then(r => r.json());
          if (res?.hex) return res.hex.trim();
          throw new Error(res?.error || `Failed to fetch raw tx for ${txid}`);
        },

        async ensureNonWitnessUtxo(utxos) {
          const missing = utxos.filter(u => !u.nonWitnessUtxo);
          if (!missing.length) return utxos;
          const uniqTxids = Array.from(new Set(missing.map(u => u.txid)));
          const fetched = new Map();
          for (const txid of uniqTxids) {
            const hex = await this.fetchRawTxHex(txid);
            fetched.set(txid, hex);
          }
          return utxos.map(u => {
            if (u.nonWitnessUtxo) return u;
            const hex = fetched.get(u.txid);
            return hex ? { ...u, nonWitnessUtxo: hex } : u;
          });
        },

        buildUnsignedReleaseTx({ utxos, destinationAddress, outputSats, lockTime }) {
          if (!window.coinjs) throw new Error('coin.js not loaded.');
          if (!Array.isArray(utxos) || !utxos.length) throw new Error('No inputs provided.');
          if (!destinationAddress) throw new Error('Missing destination address.');

          const sendValue = Math.trunc(Number(outputSats) || 0);
          if (sendValue <= 0) throw new Error('Output amount must be positive.');

          const tx = coinjs.transaction();
          tx.lock_time = typeof lockTime === 'number' ? lockTime : 0;

          utxos.forEach((u) => {
            tx.addinput(u.txid, Number(u.vout), u.redeemScript, CLAIM_RBF_SEQUENCE);
          });

          const valueBtc = sendValue / 1e8;
          tx.addoutput(destinationAddress, valueBtc);

          return tx.serialize();
        },

                    async signCltvReleaseTx({ unsignedTxHex, wif, wifs = null }) {
          if (!window.coinjs) throw new Error('coin.js not loaded.');

          const tx = coinjs.transaction();
          const txUnserialized = tx.deserialize(unsignedTxHex);

          if (!txUnserialized || !txUnserialized.ins || !txUnserialized.ins.length) {
            throw new Error('Invalid or empty transaction inputs.');
          }

          if (Array.isArray(wifs)) {
            if (wifs.length !== txUnserialized.ins.length) {
              throw new Error('WIF count does not match transaction input count.');
            }

            for (let i = 0; i < txUnserialized.ins.length; i++) {
              if (!wifs[i]) {
                throw new Error(`Missing WIF for input ${i}.`);
              }

              txUnserialized.signhodl(i, wifs[i], 1);
            }
          } else {
            if (!wif) throw new Error('Missing WIF for signing.');

            for (let i = 0; i < txUnserialized.ins.length; i++) {
              txUnserialized.signhodl(i, wif, 1);
            }
          }

          const signedHex = txUnserialized.serialize();

          return {
            hex: signedHex,
            vsize: Math.ceil(signedHex.length / 2),
            txid: this.computeTxidFromHex(signedHex)
          };
        },
        computeTxidFromHex(rawHex) {
          try {
            if (!window.Crypto || !Crypto.util || !window.coinjs || !rawHex) {
              return '';
            }

            // Deserialize first so SegWit witness data can be excluded.
            // Bitcoin txid is the double-SHA256 of the non-witness serialization.
            const decoded = coinjs.transaction().deserialize(rawHex);
            if (!decoded) return '';

            decoded.witness = false;
            const baseHex = decoded.serialize();

            const first = Crypto.SHA256(
              Crypto.util.hexToBytes(baseHex),
              { asBytes: true }
            );
            const second = Crypto.SHA256(first, { asBytes: true });

            return Crypto.util.bytesToHex(second.reverse());
          } catch (err) {
            console.error('Failed to compute txid', err);
            return '';
          }
        },
        async releaseReady() {
            
          if (!this.unlocked) {
            this.error = 'Unlock the gift first.';
            return;
          }
          const readyRows = this.rows.filter(r => r.ready && !r.spent);
          if (!readyRows.length) {
            this.notice = 'No payments are ready to release.';
            return;
          }
          if (!window.coinjs) {
            this.error = 'Transaction builder not available (coin.js missing).';
            return;
          }
          try {
            this.loading = true;
            this.error = '';
            this.notice = '';

            // Collect UTXOs for ready addresses
            const utxos = [];
            const readyAddresses = new Set(readyRows.map(r => r.address));

            // Preferred: use cached utxos gathered from RPC (includes vout)
            for (const r of readyRows) {
              const cached = this.utxoCache.get(r.address) || [];
              cached.forEach(u => {
                utxos.push({
                  txid: u.txid || u.tx_hash || '',
                  vout: typeof u.vout !== 'undefined' ? Number(u.vout) : (typeof u.txout_n !== 'undefined' ? Number(u.txout_n) : (typeof u.n !== 'undefined' ? Number(u.n) : undefined)),
                  value: Number(u.value) || 0,
                  redeemScript: r.redeemScript || '',
locktime: r.locktime,
childIndex: r.childIndex ?? null
                });
              });
            }

            // Fallback: derive from known txs if cache missing
            if (!utxos.length) {
              for (const tx of this.txs || []) {
                const txid = tx?.txid;
                const vouts = tx?.vout || [];
                for (const o of vouts) {
                  const addr = o?.scriptpubkey_address || '';
                  if (readyAddresses.has(addr)) {
                    const matchedRow = readyRows.find(x => x.address === addr);
                    utxos.push({
                      txid,
                      vout: typeof o.n !== 'undefined' ? Number(o.n) : (typeof o.vout !== 'undefined' ? Number(o.vout) : undefined),
                      value: Number(o.value) || 0,
                      redeemScript: matchedRow?.redeemScript || '',
locktime: matchedRow?.locktime,
childIndex: matchedRow?.childIndex ?? null
                    });
                  }
                }
              }
            }

            if (!utxos.length) {
              throw new Error('No UTXOs found for ready outputs.');
            }

            if (utxos.some(u => !u.txid || !Number.isInteger(u.vout) || u.vout < 0)) {
              throw new Error('Missing or invalid txid/vout for one or more ready outputs.');
            }

            if (utxos.some(u => !u.redeemScript)) {
              throw new Error('Missing redeem script for one or more ready outputs.');
            }

            if (!this.releaseAddress) {
              throw new Error('Missing destination address.');
            }

                        // H-15: independently verify each input amount against the raw funding transaction
            const verifiedUtxos = await this.ensureNonWitnessUtxo(utxos);

            for (const u of verifiedUtxos) {
              if (!u.nonWitnessUtxo) {
                throw new Error(`Unable to verify funding transaction ${u.txid}.`);
              }

              const computedTxid = this.computeTxidFromHex(u.nonWitnessUtxo);
              if (!computedTxid || computedTxid !== u.txid) {
                throw new Error(`Funding transaction ID verification failed for ${u.txid}.`);
              }

              const vout = Number(u.vout);
              if (!Number.isInteger(vout) || vout < 0) {
                throw new Error(`Invalid output index for transaction ${u.txid}.`);
              }

              const rawTx = coinjs.transaction().deserialize(u.nonWitnessUtxo);

              if (!rawTx?.outs || vout >= rawTx.outs.length) {
                throw new Error(`Funding output ${vout} not found in transaction ${u.txid}.`);
              }

              const actualValue = Number(rawTx.outs[vout].value);
              const reportedValue = Number(u.value);

              if (!Number.isSafeInteger(actualValue) || actualValue < 0) {
                throw new Error(`Invalid raw transaction value for ${u.txid}:${vout}.`);
              }

              if (!Number.isSafeInteger(reportedValue) || reportedValue < 0) {
                throw new Error(`Invalid reported UTXO value for ${u.txid}:${vout}.`);
              }

              if (actualValue !== reportedValue) {
                throw new Error(
                  `Security check failed: reported amount does not match the Bitcoin transaction for ${u.txid}:${vout}.`
                );
              }
            }
            const totalValue = utxos.reduce((s, u) => s + (u.value || 0), 0);
            const backendClient = new BtcBackendClient({
              baseUrl: this.baseApi.replace(/\/bitcoin$/, '/')
            });
            const feeEstimate = await backendClient.fetchFeeEstimate();
            const feeRate = selectClaimFeeRate(feeEstimate);
            const txLockTime = utxos.reduce((m, u) => Math.max(m, Number(u.locktime) || 0), 0);

            // First pass to estimate size and fee
            const unsignedEstimate = this.buildUnsignedReleaseTx({
              utxos,
              destinationAddress: this.releaseAddress,
              outputSats: totalValue,
              lockTime: txLockTime
            });

              const releaseWifs = this.cltvKeyMode === 'per-index'
  ? await Promise.all(utxos.map(async (u) => {
      if (!Number.isInteger(u.childIndex) || u.childIndex < 0) {
        throw new Error('Missing CLTV child index for release input.');
      }

      const childKey = await this.cryptoManager.deriveCltvChild(u.childIndex);
      return childKey.wif;
    }))
  : null;
            const signedEstimate = await this.signCltvReleaseTx({
  unsignedTxHex: unsignedEstimate,
  wif: this.cryptoManager.cltvWif || this.cryptoManager.wif,
  wifs: releaseWifs
});
            const estFee = Math.ceil((signedEstimate.vsize || 0) * feeRate);
                          const MAX_RELEASE_FEE_SATS = 100000; // 0.001 BTC emergency safety ceiling
            if (!Number.isSafeInteger(estFee) || estFee < 0 || estFee > MAX_RELEASE_FEE_SATS) {
              throw new Error('Calculated miner fee exceeds the bc1q21 safety limit.');
            }
            const sendValue = totalValue - estFee;
            if (sendValue <= 0) {
              throw new Error('Not enough funds to cover fee.');
            }

            // Build with fee deducted
            const unsignedFinal = this.buildUnsignedReleaseTx({
              utxos,
              destinationAddress: this.releaseAddress,
              outputSats: sendValue,
              lockTime: txLockTime
            });

            const signedFinal = await this.signCltvReleaseTx({
  unsignedTxHex: unsignedFinal,
  wif: this.cryptoManager.cltvWif || this.cryptoManager.wif,
  wifs: releaseWifs
});
            const finalFee = totalValue - sendValue;
            this.releaseTxHex = signedFinal.hex;
            this.notice = `Release transaction ready. TXID (pre-broadcast): ${signedFinal.txid || 'n/a'} (fee ~${finalFee} sats)`;

            // Try broadcast via backend
            try {
              const res = await backendClient.broadcastRawTx(signedFinal.hex);
              if (res?.success && res.txid) {
                this.notice = `Release transaction broadcast. TXID: ${res.txid}`;
                this.releaseTxid = res.txid;
                const readySet = new Set(readyRows.map(r => r.address));
                this.rows = this.rows.map(r => readySet.has(r.address) ? { ...r, pending: true, ready: false } : r);
                this.updateReadyCount();
              } else if (res?.error) {
                this.error = `Broadcast failed: ${res.error}`;
              } else {
                this.error = 'Broadcast response unknown.';
              }
            } catch (err) {
              this.error = `Broadcast error: ${err?.message || err}`;
            }
          } catch (e) {
            this.error = e?.message || String(e);
          } finally {
            this.loading = false;
          }
        },

        async refreshSpentStatuses() {
          // Marks "spent" if tx history shows outputs redeemed; caches utxos otherwise
          try {
            const now = new Date();
            const tomorrowUtc = new Date(Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth(),
              now.getUTCDate() + 1
            ));

            const dueRows = this.rows.filter(r => {
              if (!r.releaseDate) return false;
              const rd = new Date(r.releaseDate + 'T00:00:00Z');
              return rd <= tomorrowUtc;
            });

            const checks = dueRows.map(async (r) => {
              const url = `${this.baseApi}/address/${r.address}/txs`;
              const data = await fetch(url).then(resp => resp.json());
              const txs = Array.isArray(data) ? data : [];

              let spendingTx = null;
              let candidateOutput = null;

              for (const tx of txs) {
                const vouts = tx?.vout || [];
                vouts.forEach((out, idx) => {
                  if ((out?.scriptpubkey_address || '') === r.address) {
                    candidateOutput = {
                      txid: tx.txid,
                      vout: typeof out.n !== 'undefined' ? out.n : idx,
                      value: Number(out.value) || 0,
                      scriptpubkey: out.scriptpubkey || ''
                    };
                  }
                });

                if (!spendingTx) {
                  const vins = tx?.vin || [];
                  const spentHere = vins.some(v => (v?.prevout?.scriptpubkey_address || '') === r.address);
                  if (spentHere) spendingTx = tx;
                }
              }

              if (!spendingTx && candidateOutput) {
                this.utxoCache.set(r.address, [{
                  txid: candidateOutput.txid,
                  vout: candidateOutput.vout,
                  value: candidateOutput.value,
                  scriptpubkey: candidateOutput.scriptpubkey,
                  nonWitnessUtxo: ''
                }]);
              } else {
                this.utxoCache.delete(r.address);
              }

              const priceUsd = spendingTx ? this.extractPriceUsd(spendingTx?.status) : NaN;
              const usdAtRelease = Number.isFinite(priceUsd) ? (r.btc * priceUsd) : NaN;

              return { address: r.address, spent: Boolean(spendingTx), usdAtRelease };
            });

            const results = await Promise.all(checks);
            const map = new Map(results.map(x => [x.address, x]));

            this.rows = this.rows.map(r => {
              if (!map.has(r.address)) return r;
              const { spent, usdAtRelease } = map.get(r.address);
              return {
                ...r,
                spent,
                pending: spent ? false : r.pending,
                checkedSpent: true,
                usdAtRelease: Number.isFinite(usdAtRelease) ? usdAtRelease : r.usdAtRelease
              };
            });
          } catch (e) {
            // non-fatal
            this.error = `Status refresh failed: ${e?.message || e}`;
          }
          this.updateReadyCount();
        },

        extractPriceUsd(status) {
          const list = Array.isArray(status?.price) ? status.price : [];
          const entry = list.find(p => typeof p?.USD === 'number');
          const value = entry ? Number(entry.USD) : NaN;
          return Number.isFinite(value) ? value : NaN;
        },

        // --- helpers used by your existing template ---
        formatUSD(v) {
          if (isNaN(v)) return '-';
          return new Intl.NumberFormat(undefined, {
            style: 'currency', currency: 'USD', maximumFractionDigits: 2
          }).format(v);
        },
        formatDate(d) {
          if (!d) return '-';
          return new Intl.DateTimeFormat(undefined, {
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
          }).format(d) + ' UTC';
        },
        mempoolTxUrl(txid) {
          return `https://mempool.space/tx/${encodeURIComponent(txid || '')}`;
        },
        hasPending() {
          return this.rows.some(r => r.pending);
        },

        // keep your existing bindings alive
        get createdAtForTemplate() { return this.createdAt; },
        get giftOutputs() { return this.timelockedOutputs; },
        get prices() {
          return {
            creation: Number.isFinite(this.creationPriceUSD) ? this.creationPriceUSD : NaN,
            time: this.creationPriceTime,
            history: this.priceHistory
          };
        },
        get totalUSDAtCreation() {
          if (!Number.isFinite(this.creationPriceUSD)) return NaN;
          return this.rows.reduce((sum, row) => {
            const value = Number(row.usdAtCreation);
            return sum + (Number.isFinite(value) ? value : 0);
          }, 0);
        },
        get totalUSDAtRelease() {
          let hasValue = false;
          const total = this.rows.reduce((sum, row) => {
            const value = Number(row.usdAtRelease);
            if (Number.isFinite(value)) {
              hasValue = true;
              return sum + value;
            }
            return sum;
          }, 0);
          return hasValue ? total : NaN;
        },
      };
    }
