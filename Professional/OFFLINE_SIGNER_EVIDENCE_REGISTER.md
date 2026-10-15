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

## Candidate evaluation protocol

For each proposed device, record **model, firmware version, transport method, independent evidence link or reproducible test log, fixture identifier, result (pass/fail/untested), and any deviation from retail**. Never infer compatibility from marketing terms such as “air-gapped”, “PSBT compatible”, “BIP39”, or “Bitcoin-only”.

**Fail-closed decision:** Any H-03 or H-06 failure means the device is **not a complete one-device solution**. Do not silently move wallet-derived AES secrets into the browser, replace the retail CLTV format, or add a separate offline companion without a documented architecture decision and user approval. A missing test is **untested**, not passed.

## Safe next experiment

Using only the fixed public disposable wallet fixture, obtain a candidate device's public account information and compare the public funding address, release destination and four CLTV scripts against the independently derived expected results. No seed entry into the website and no real funds. If this fails, stop before attempting encrypted-date handling or signing.

**Current decision: NO-GO for device selection and production integration.** Software CI passing is not device certification.

## Jade Plus synthetic QR signing evidence — 2026-10-15

See [V7 evidence record](JADE_PLUS_V7_SYNTHETIC_QR_SIGNING_EVIDENCE_2026-10-15.md). The corrected seven equal-sized BC-UR fountain fragments imported successfully; Jade reviewed the expected 99,000 sat output and 1,000 sat fee, signed the disposable synthetic fixture offline, and returned animated signed-PSBT QR frames. The session reported independent secp256k1 signature verification. **H-06 is PARTIAL, not passed:** no complete CLTV script finalization or regtest consensus validation has been demonstrated. **H-03 remains device-untested; overall decision remains NO-GO.** No retail integration or production deployment authorized.
