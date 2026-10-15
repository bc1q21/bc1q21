# Hardware-neutral offline signer evidence register

**Scope:** bc1q21 Professional isolated prototype only. This is a test register, not a claim that a particular device works. No production keys, hardware connection, Bitcoin broadcast, or retail changes are permitted in this phase.

## Acceptance evidence and status

| ID | Requirement | Current evidence | Status | Required to pass |
| --- | --- | --- | --- | --- |
| H-01 | Public BIP84 account derivation and funding/release destination parity | `jade-xpub-cltv-handoff.check.mjs`, `public-multi-release-gift-integration.check.mjs` | Partial — disposable public fixture; no independent hardware origin attestation | Device-derived account public information and verified wallet origin; exact `/0/0`, `/0/1`, `/1/{index}` comparison |
| H-02 | Four retail-format CLTV outputs and calendar schedule | `public-multi-release-gift-integration.check.mjs` | Software fixture passed; hardware untested | Device-confirmed derivation and script support for all four outputs |
| H-03 | Wallet-derived offline AES first-date encryption | `disposable-wallet-retail-date-interoperability.check.mjs`, `disposable-encrypted-four-release-flow.check.mjs` | Software fixture passed; device untested | Demonstrate secret stays offline and exact `BC1Q21G1` ciphertext is produced without exporting reusable key |
| H-04 | Offline decrypt and gift-bound schedule-only return | `synthetic-offline-unlock-pipeline.check.mjs`, `disposable-encrypted-four-release-flow.check.mjs` | Software fixture passed; device identity and beneficiary approval not attested | Offline approval, ciphertext authentication, context-bound schedule-only response, replay rejection |
| H-05 | Retail funding transaction signing | `signed-gift-output-intent-check.check.mjs`, `gift-distribution-core-response-gate.check.mjs` | Public comparisons only; signature and trusted-chain validation absent | Offline device signs exact inputs, ordered outputs, fees and trailing OP_RETURN; independent signature and UTXO verification |
| H-06 | Legacy P2SH CLTV beneficiary release signing | `jade-xpub-cltv-handoff.check.mjs`, `finalize-synthetic-cltv.check.mjs`, `JADE_PLUS_V7_SYNTHETIC_QR_SIGNING_EVIDENCE_2026-10-15.md` | Partial — Jade Plus synthetic QR signing round-trip and ECDSA verification reported passed (2026-10-15); complete CLTV script satisfaction/regtest consensus and multiple-release test unproven | Device signs actual redeem-script spend after locktime; regtest consensus/script verification and multiple-release test |
| H-07 | Private material never enters website | Public handoff modules and synthetic offline fixtures | Architecture intent only; device boundary untested | Inspect real transport payloads, browser memory paths, QR data and logs; prove no recovery words, xprv, child private key or reusable AES secret cross online boundary |
| H-08 | Original retail UX and creator-to-beneficiary transfer | `MINIMAL_RETAIL_AIRGAP_ADAPTER.md`, `ENGINEERING_HANDOVER.md` | Specification only | Usability acceptance: creator independently initializes wallet and personally hands beneficiary gift card **and** recovery words; same retail choices and gift card |

## V7 captured-signature regression confirmation — 2026-10-15

GitHub Actions **Professional isolated PSBT tests**, run **#263**, commit **`f60c48e`**, on `professional/isolated-release-prototype`: the explicitly configured `node --test Professional/jade-v7-captured-signed-cltv.check.mjs` step completed successfully (TAP 13, **3 passed, 0 failed, 0 skipped**). Its three checks were: (1) captured Jade V7 signed PSBT matches recorded bytes and the approved unsigned synthetic fixture; (2) captured signature finalizes to the expected legacy P2SH CLTV `scriptSig` **without broadcast**; (3) deliberate signature tampering is rejected. Evidence: https://github.com/bc1q21/bc1q21/actions/runs/38791725328 . This supersedes the earlier statement that no CLTV script finalization was demonstrated, **but does not establish Bitcoin Core/regtest consensus acceptance, a real spend, or multi-release compatibility**. H-06 remains **PARTIAL** and device/production decision **NO-GO**; H-03 remains device-untested. No keys, funds, broadcasting, retail deployment, or `main` changes were involved.

## Bitcoin Core regtest consensus/mempool evidence — 2026-10-13, independently verified 2026-10-15

GitHub Actions [Professional Bitcoin Core regtest validation, run #8](https://github.com/bc1q21/bc1q21/actions/runs/38427524114), commit `498ce7e`, isolated branch `professional/isolated-release-prototype`: job `regtest-only` completed **success**. GitHub's recorded job steps confirm **both** `Execute Bitcoin Core script acceptance tests` and `Execute integrated Professional public-only funded regtest acceptance` completed **success**. The workflow uses a disposable Bitcoin Core 28 regtest Docker container with RPC bound to loopback. Inspected test source demonstrates funded, confirmed regtest P2SH CLTV UTXOs, `testmempoolaccept` acceptance of a valid spend and rejection of locktime, final-sequence, signature, changed-output and wrong-script variants. The integrated stage builds the unsigned PSBT via `prepareProfessionalReleaseFromPublicHandoff` and signs using a deterministic **disposable software fixture key**, **not Jade Plus**. No public Bitcoin broadcast or block-mined spend is claimed. This is stronger than standalone synthetic script verification, but **does not establish that the Jade-signed V7 synthetic fixture spent a genuine regtest UTXO, nor hardware signing of a real funded CLTV release**. H-06 remains **PARTIAL** and overall **NO-GO** until a new real-regtest UTXO is signed offline by the disposable Jade device, and other acceptance criteria are met.

## Candidate evaluation protocol

For each proposed device, record **model, firmware version, transport method, independent evidence link or reproducible test log, fixture identifier, result (pass/fail/untested), and any deviation from retail**. Never infer compatibility from marketing terms such as “air-gapped”, “PSBT compatible”, “BIP39”, or “Bitcoin-only”.

**Fail-closed decision:** Any H-03 or H-06 failure means the device is **not a complete one-device solution**. Do not silently move wallet-derived AES secrets into the browser, replace the retail CLTV format, or add a separate offline companion without a documented architecture decision and user approval. A missing test is **untested**, not passed.

## Safe next experiment

Using only the fixed public disposable wallet fixture, obtain a candidate device's public account information and compare the public funding address, release destination and four CLTV scripts against the independently derived expected results. No seed entry into the website and no real funds. If this fails, stop before attempting encrypted-date handling or signing.

**Current decision: NO-GO for device selection and production integration.** Software CI passing is not device certification.

## Jade Plus synthetic QR signing evidence — 2026-10-15

See [V7 evidence record](JADE_PLUS_V7_SYNTHETIC_QR_SIGNING_EVIDENCE_2026-10-15.md). The corrected seven equal-sized BC-UR fountain fragments imported successfully; Jade reviewed the expected 99,000 sat output and 1,000 sat fee, signed the disposable synthetic fixture offline, and returned animated signed-PSBT QR frames. The session reported independent secp256k1 signature verification. **H-06 is PARTIAL, not passed:** synthetic CLTV scriptSig finalization is now regression-tested, but regtest Bitcoin Core mempool acceptance with disposable software signing is demonstrated, but Jade-signed real-UTXO regtest acceptance is not. **H-03 remains device-untested; overall decision remains NO-GO.** No retail integration or production deployment authorized.
