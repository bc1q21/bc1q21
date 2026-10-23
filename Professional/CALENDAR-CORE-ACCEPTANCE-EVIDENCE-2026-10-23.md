# Calendar CLTV genuine Bitcoin Core acceptance — 2026-10-23

**Scope:** Professional isolated regtest branch only. This is a completed *software-signer consensus/mempool-policy test*, not end-to-end beneficiary acceptance.

## Verified source and run
- GitHub Actions **39989390071**, commit `5073ce26f682080c941dedb651df570daad6977e`, job `regtest-only`, **success**.
- Workflow `.github/workflows/professional-bitcoin-core-regtest.yml` executed `Professional/integrated-calendar-timestamp-core-acceptance.mjs` against Bitcoin Core 28 disposable regtest.
- Test creates a real funded P2SH CLTV UTXO with **timestamp** locktime `1700000000` (above 500,000,000, not a block-height lock); checks Core MTP is later; builds public-only Professional PSBT; signs using a deterministic disposable **software** key; calls `testmempoolaccept` without broadcasting.
- Core reported **allowed=true** for the valid calendar-timestamp release. It rejected locktime below CLTV, final sequence, corrupted signature, post-signing output modification and wrong redeem script. The job printed `PASS: genuine calendar-timestamp CLTV regtest UTXO -> public-only Professional PSBT -> disposable signature -> Bitcoin Core acceptance. No broadcast.`

## What this does not prove
- No real Core-funded **future** calendar gift tested before maturity and then after maturity on the same chain; current test uses an already-past timestamp and verifies the pre-maturity rejection only through an invalid transaction locktime, not by advancing chain MTP.
- The trusted-local beneficiary approval-to-QR flow is separately tested against a **mock** Core RPC, not joined to this funded Core transaction in the same acceptance run.
- No Jade signature of this calendar release, no 24-output original gift provenance or independently delivered original creator commitment, no original 12-word offline recovery and legacy first-date decryption, no complete gift-card-to-recipient UX proof.
- No live Bitcoin, production readiness, or deployment authorization.

## Next high-value acceptance test
Join one **new prospective, explicitly authenticated** disposable regtest gift's creator funding evidence to the trusted-local beneficiary review, fresh UTXO checks and one-time unsigned QR export against the *same live disposable Core chain*. Include a before/after MTP maturity transition if feasible. Never fabricate historical commitment for the original October 20 gift. Continue to hold physical Jade until a separately approved single final test.

**Gate:** genuine calendar CLTV Core acceptance **PASS (software only)**; complete beneficiary lifecycle **OPEN / NO-GO**.

## Integrated same-gift local Core beneficiary QR acceptance — 2026-10-23 update

**PASS — software-only:** GitHub Actions **39990733268**, commit `4bf8c153d5e047811d6b9db99f4f2ff900f52171`, completed successfully. Parallel isolated tests **39990733388** also passed.

The extended `integrated-calendar-timestamp-core-acceptance.mjs` now funds a **new disposable** timestamp-CLTV output in Bitcoin Core, verifies that output using the trusted local credentialed read-only Core transport, checks the complete one-output public gift binding against a digest freshly computed for this test, reviews the exact unsigned PSBT, records approval, finalizes the review, and exports **one-use unsigned UR:crypto-psbt QR frames**. A second QR export is rejected. The same test subsequently validates the signed software-fixture transaction through Core `testmempoolaccept`, without broadcast. Runner output confirms both `PASS: same funded calendar gift -> live Core -> local review -> one-use unsigned QR; creator authenticity NOT proven` and `PASS: genuine calendar-timestamp CLTV regtest UTXO -> public-only Professional PSBT -> disposable signature -> Bitcoin Core acceptance. No broadcast.`

**Security limitations still blocking beneficiary acceptance:** The public digest was computed within this test from the same gift data; no independent creator delivery or recipient authentication is demonstrated. This uses a single already-mature output and disposable software signer, not the original 24-output gift, physical Jade, full recipient website/card route, calendar MTP transition on-chain, or original 12-word offline restoration. Do not promote these results to creator-authenticated or production-ready status.

**Gate:** integrated same-gift Core → local beneficiary review → one-use unsigned QR **PASS (regtest software)**; complete end-to-end recipient/Jade/recovery/provenance **OPEN / NO-GO**.
