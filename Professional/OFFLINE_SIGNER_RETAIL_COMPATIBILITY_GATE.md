# Offline signer compatibility acceptance gate — retail parity

**Status:** evidence-based engineering checklist, **not** device certification. Applies only to the isolated Professional prototype. No device is selected or preferred. No changes to retail, main, deployment, or broadcast.

## Non-negotiable user workflow

The creator independently generates and holds the recovery words, initializes their own offline wallet, and personally transfers **both** the ordinary gift card and recovery words to the beneficiary. bc1q21 never generates, imports, stores, transmits, recovers, or manages those words. The beneficiary uses the privately received words in their own compatible offline wallet. Preserve the retail gift amounts, release dates, multiple outputs, fee behavior, gift card, and redemption UI. Move only private operations across the air gap.

## Exact compatibility requirements from existing retail code

| Stage | Existing retail requirement | Offline mechanism must demonstrate | Evidence needed |
| --- | --- | --- | --- |
| Public setup | `CryptoManager.js` uses BIP84 account `m/84'/0'/0'`; funding child `/0/0`, release destination `/0/1`, and CLTV children `/1/{index}`. | Reproduce the public derivations and each retail CLTV redeem script without exposing any private child or mnemonic online. | Fixed disposable-seed fixture: independent account xpub, funding/change and multiple CLTV address/script comparisons. |
| First-date secrecy | `CryptoManager.js` derives the OP_RETURN secret by SHA256 of private child `/0/2` bytes concatenated with UTF-8 `bc1q21-opreturn-encryption-v1`. | Derive/use that secret **offline**; never export the reusable secret, child private key, or recovery words. An xpub or PSBT signature cannot replace this. | Exact disposable-fixture AES interoperability, plus negative wrong-wallet/wrong-gift tests. |
| Date encryption | `AESHelper.js` current format: `BC1Q21G1`, 16-byte salt, 12-byte IV, PBKDF2-SHA256 100,000, AES-GCM. Legacy `Salted__` gifts have separate CBC recovery behavior. | Produce and decrypt current retail-compatible ciphertext; explicitly decide whether legacy gifts are in scope and test them separately. | Byte-format interoperability with retail decryptor; ciphertext never mistaken for plaintext. |
| Gift funding | `TransactionManager.buildAndSignDistribution` signs a retail transaction and appends zero-value encrypted-date OP_RETURN after payment outputs. | Review and sign exactly approved funding inputs, gift outputs in order, service fee, optional change, miner fee and OP_RETURN; no arbitrary extra outputs. | Compare raw signed transaction to approved public intent, independently verify signatures and referenced UTXOs. |
| Gift unlock | `gift/gift-h08.js` recovers the encrypted first date and reconstructs the schedule against the actual CLTV gift outputs. | After explicit offline approval, return **only** gift-bound public schedule information, not the AES secret or seed. | Multiple-release script/schedule match; wrong gift, altered ciphertext and replay rejection. |
| Release | Retail uses legacy P2SH CLTV spend with locktime and script-specific signing. | Sign the **exact** CLTV redeem script and required scriptSig/PSBT form, with explicit beneficiary review and no private material online. | Disposable multi-release, post-locktime regtest verification and signature validation. |

## Go/no-go device evaluation

A candidate **fails** if it supports ordinary air-gapped PSBT signing but cannot demonstrate the exact legacy P2SH CLTV release path. It also **fails as a complete one-device solution** if it cannot perform the retail-derived AES first-date encryption/decryption and constrained schedule disclosure. A separate offline component is only a fallback after documenting this limitation; do not silently change gift format or claim generic signing solves schedule recovery.

The networked website may check public intent and parse a caller-supplied Bitcoin Core `gettxout` response. This **does not** prove the node connection is trusted, the snapshot is fresh, or the transaction signatures are valid. A `gettxout` response for a confirmed output does not prove the signing device owns it.

## Minimal acceptance sequence

1. Confirm the existing retail code paths and fixed disposable fixture; reject any unexpected derivation or output change.
2. Prove public setup and multiple CLTV outputs without online recovery words.
3. Prove offline encryption, decryption, and gift-bound schedule-only response.
4. Prove unsigned funding intent → explicit offline review → signed return → independent raw transaction and signature validation.
5. Prove each CLTV release, fees, timelock behavior, and beneficiary recovery with disposable fixtures only.
6. Only then decide whether any tested device and transport are compatible. No production sign-off follows merely from green CI.

**Current status:** public validation, synthetic UTXO response adapters, and separate synthetic signing experiments exist; an integrated, verified real-device retail-format gift creation/unlock/multi-release workflow **does not**. Hardware choice remains open.
