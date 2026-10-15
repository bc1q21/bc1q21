# Jade Plus V7 synthetic PSBT QR round-trip — 2026-10-15

**Scope:** bc1q21 Professional isolated prototype only. **Branch:** `professional/isolated-release-prototype`. **Result:** PASS for this one disposable synthetic PSBT QR signing round-trip; **NO-GO** for device certification, retail integration, or real funds.

## Fixture and evidence

- Corrected unsigned synthetic PSBT: **283 bytes**, SHA-256 `ee120308ac348227d0f249662ed52108c0ca4f183be6baa9517d7caf35818544`.
- Synthetic input: 100,000 sat; destination output: 99,000 sat; implied fee: 1,000 sat; nLockTime: 110. No real UTXO or network broadcast.
- Device: **Blockstream Jade Plus**, disposable test wallet only. Previous handover identified firmware **1.0.41**; firmware was **not freshly reconfirmed** in this session.
- Input QR source: `bc1q21_Jade_Unsigned_PSBT_QR_v7_Fixed_Fragments_Offline.html` (local user test file, **not** deployed).
- Signed response capture: `bc1q21_Jade_Signed_PSBT_QR_frames(2).txt` (9 captured `UR:CRYPTO-PSBT` fountain frames, sequence indices 1–9 with sequence length 7).
- Reconstructed signed PSBT: `bc1q21_jade_v7_captured_signed.psbt`, **390 bytes**, SHA-256 `94f7594277da053fabb3a029c940c189f3aac32b21b23c152bbb4788703dcf96`. These local artifacts are not committed to this repository by this evidence note; retain them for reproducibility.

## What happened

1. Earlier V4/V5 QR encodings repeatedly stalled at approximately 75–90% on Jade. V6 improved quiet zones and offline presentation, but still stalled.
2. Root-cause candidate: V4 carried six 45-byte fountain fragments and a final 16-byte fragment; V7 changed to **seven equal-sized 41-byte fragments** with final-fragment padding. Earlier simplistic reassembly could recover the unsigned PSBT without proving interoperability with a standard fountain decoder.
3. Jade Plus imported V7 animated QR successfully and displayed the expected **99,000 sat** destination output and **1,000 sat** fee.
4. User approved **offline signing of this disposable synthetic fixture only**. Jade displayed animated signed-transaction QR labeled “Scan with Wallet App”.
5. Existing local signed-PSBT QR capture page read the return frames via Windows webcam. Reducing Jade screen brightness made webcam capture immediate.
6. Session's independent verification reported successful reconstruction of the returned PSBT, unchanged unsigned transaction, matching expected public key, and valid secp256k1 ECDSA / legacy SIGHASH_ALL signature. This note records that result; a separately committed, reproducible signature-verification test for this exact artifact is still desirable.

## Interpretation and limitations

- **PASS:** QR transport and cryptographic signing for this **single synthetic fixture**. The observed change from repeated import stalls to success is consistent with correcting unequal fountain fragment sizes; it does **not** establish a formal root-cause proof or all-device compatibility.
- **NOT proven:** Real spendability or consensus validation of a CLTV redeem-script transaction; correct final scriptSig/witness and complete regtest finalization; wallet-derived offline AES (`BC1Q21G1`); hardware-derived account/address parity; four-release end-to-end flow; beneficiary experience; device-independent support; trusted-chain/UTXO validation.
- **H-06 remains PARTIAL:** this successful synthetic device signature strengthens evidence but does not meet the register's full device-plus-regtest consensus acceptance criteria.
- **H-03 remains UNTESTED on device.** No production keys, seed words, xprv, real funds, Bitcoin broadcast, retail merge, or deployment used.
- This test does not change the creator-to-beneficiary recovery-words handoff model; bc1q21 never handles those words.

## Next safe engineering step

Commit a reproducible decoder and signature-verification regression fixture for the captured signed PSBT on this isolated branch, then separately investigate full script satisfaction/finalization in a regtest environment without real funds. Keep H-01–H-08 fail-closed and preserve retail isolation.
