# Restricted beneficiary QR integration contract — 2026-10-23

**Status: design gate only. NOT implemented, NOT beneficiary-ready.** Branch `professional/isolated-release-prototype`, regtest only. This document authorizes no signing, broadcasting, live changes, or physical Jade action.

## Existing independently tested pieces
1. The trusted-local entry point `locally-verified-beneficiary-review.mjs` obtains full gift evidence through credentialed loopback Core and requires an independently held public commitment digest.
2. The restricted approval path binds exact release index, funding outpoint, amount, locking script, destination, fee, CLTV maturity, Core tip, and unsigned PSBT SHA-256. Approval is single-use; finalization fails closed and cannot be retried.
3. The standalone `controlled-qr-session.mjs` can encode an unsigned regtest PSBT to BC-UR frames after **its own independent approval**. Its public `approve()` method is **not** an acceptable substitute for trusted-local beneficiary authorization.

## Required integration boundary before any beneficiary QR
- The trusted-local path must retain a **private, in-process, non-serializable, one-time capability** that cannot be constructed by passing a `freshness`, `approvalRecorded`, `canExportSigningQr`, or `psbtSha256` JSON object. The capability must be issued only by the genuine finalized local review, never from the public QR session.
- Consume the capability **before** asynchronous checks or QR encoding; failures, parallel calls and restarts must not resurrect it. Document the limitation of in-memory receipts for durable cross-process protection.
- Before QR frames are produced, recheck current regtest Core tip and selected UTXO, including exact script, amount and maturity, and compare the newly built unsigned PSBT's **raw bytes digest** to the beneficiary-confirmed digest. The same release index, funding outpoint, destination, fee and CLTV locktime must match. Fail closed on tip change; require a completely new review.
- Do **not** call the legacy session's public `approve()` to simulate beneficiary authorization. Either refactor the encoder to accept an internal capability that is inaccessible to callers or add a new internal-only export path with a private capability check.
- Expose only public unsigned `ur:crypto-psbt` frames; no seed, xprv, signature, signing operation, network broadcast, or mutable authorization flags. Validate all returned frames and exact PSBT bytes.
- The recipient must compare the creator's commitment from a genuinely independent authenticated channel. A fingerprint calculated and displayed by the same potentially compromised site is not independent creator authorization.
- Add negative tests for forged/copy-pasted capabilities, replay, concurrent export, stale Core tip, spent/changed script, altered PSBT, changed release, invalid QR parameters and encoder failure. The trusted-local facade must never expose the legacy approval path.

## Remaining acceptance gates
1. Recover/verify the **original funded 24-output** public gift fixture; do not confuse synthetic 24-output fixtures with the actual original gift.
2. Resolve recipient commitment provenance or explicitly establish a **new** prospective regtest handoff, without inventing a historical creator fingerprint.
3. Implement and green-test the private QR capability and all fail-closed cases above.
4. Validate calendar **timestamp** CLTV maturity and full beneficiary journey in regtest.
5. Only then seek explicit permission for **one** final physical Jade Plus beneficiary acceptance test. The October 20 height-CLTV hardware proof must not be repeated.
