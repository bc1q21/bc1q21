# Session handover — 2026-10-14 — Jade Plus QR import incomplete

**Project:** bc1q21 Professional isolated release prototype. **Branch:** `professional/isolated-release-prototype`. **Status:** STOPPED FOR DAY; QR interoperability OPEN; NO-GO for device certification. Retail `main` remains out of scope.

## Non-negotiable design and isolation
- Preserve retail-equivalent creator/beneficiary gift workflow: creator independently initializes wallet, privately hands beneficiary gift card **and** recovery words; bc1q21 never handles recovery words.
- Hardware-neutral Professional architecture; Jade Plus is a candidate, not certified.
- Never merge/deploy to retail, use real funds, transmit recovery words/private keys, or broadcast. Do not use the owner's original Jade wallet. Use only the disposable test wallet already on Jade Plus.
- H-01–H-08 evidence register remains authoritative. H-03 offline wallet-derived AES interoperability and H-06 full legacy P2SH CLTV device signing/script validation remain unproven. Do not infer full compatibility from synthetic PSBT signing.

## Verified earlier engineering
- `Professional/finalize-synthetic-cltv.check.mjs` regression checks internal funding outpoint hash against reverse-byte display txid; prior commit `9b1fd8cb361f76ecc9834b03ad061246db703bd2`, user reported GitHub Actions #258 green.
- Previous Jade Plus firmware 1.0.41 signed an earlier synthetic CLTV PSBT and returned 9 animated `ur:crypto-psbt` frames. That signed artifact passed prior cryptographic checks; no broadcast or complete hardware acceptance. Prior unsigned fixture had reversed funding outpoint bytes, so it cannot count as a controlled round-trip for the corrected fixture.
- Corrected unsigned synthetic PSBT: 283 bytes; SHA-256 `ee120308ac348227d0f249662ed52108c0ca4f183be6baa9517d7caf35818544`. Fake 100,000 sat input, 99,000 sat output, 1,000 sat fee, nLockTime 110. No funds.

## 2026-10-14 QR experiments and observed hardware behavior
- V1 browser encoder failed `St.crc32 is not a function`.
- V2/V3 rendered animated `crypto-psbt` frames, but Jade camera did not acknowledge them at all. User repeatedly tested size/brightness/distance; **do not ask them to repeat**.
- Diagnostic exported 30 frames, with headers `ur:crypto-psbt/1-7` etc. Inspection identified incorrect JS Buffer/object encoding in fountain payload. Browser rendering or Bytewords prefix alone does not establish Jade interoperability.
- V4 rebuilt 7 standard BC-UR frames; independent checks reported round-trip reconstruction and checksum/283-byte SHA match. Screenshot showed green Ready, 7-frame animation, correct hash. Jade now recognizes frames: progress first ~20%, later ~80–90%, but NEVER finishes.
- V5 slowed the SAME seven verified frames to 2.5 seconds each. Jade progress moved in slow steps, stalled ~75% on first attempt and earlier on next. Slowdown did NOT solve import.
- **Observed conclusion:** Jade recognizes some frames, but import is incomplete. Cause remains unproven (frame-specific scan readability, timing, animation, or remaining interoperability detail). No successful new controlled signed PSBT; no user approval, no transaction broadcast.
- Local diagnostic/artifacts previously generated in conversation (may require user reupload if inaccessible in a future session): `bc1q21_Jade_Unsigned_QR_Diagnostic_Frames.txt`, `bc1q21_Jade_Unsigned_PSBT_Verified_QR_v4.html`, `bc1q21_Jade_Unsigned_PSBT_Verified_QR_v5_Slow.html`, corrected PSBT `bc1q21-jade-synthetic-corrected-unsigned.psbt`. Do NOT assume local sandbox files persist into another chat.

## Tomorrow's exact starting point (software-first; no hardware repetition)
1. Read this handover and `Professional/OFFLINE_SIGNER_EVIDENCE_REGISTER.md`, inspect Professional tests and latest branch state.
2. Independently decode all seven V4/V5 BC-UR fountain frames into CBOR byte-string PSBT; validate frame index, sequence length, message length, checksums, payload bytes, SHA, and Jade-supported `crypto-psbt` framing. Compare earlier successful capture if available. Preserve reproducible decoder/test source in `Professional/`.
3. Investigate **why the device stalls despite recognizing frames**, especially whether a particular frame is systematically hard to scan. Consider controlled presentation tests (manual step through frames, QR module density/quiet zone, frame size, different error correction or shorter fountain chunks), but do not create another version based only on speculation.
4. Only once independently validated, give user **one simple next hardware step**. Before signing, review on-device details and require explicit approval. Test disposable fixture only.
5. Keep H-01–H-08 fail-closed. No retail code changes, merges, deployments, real funds, or broadcast.

## User workflow preference
User is tired after ~4–6 hours of work. Pause now. Start a **new chat tomorrow**; user is not a programmer, so explain clearly and give exactly one actionable step at a time. Avoid repeating brightness/zoom/distance experiments or implying QR progress equals signing success.
