# Jade Plus V7 offline QR reference review — 2026-10-16

## Provenance and scope
User supplied local file `bc1q21_Jade_Unsigned_PSBT_QR_v7_Fixed_Fragments_Offline(1).html` for inspection, SHA-256 `fb8d480af83f936a7f095c86999285285dbaa3d9cbbcb79f71148ec9626462b7`. File is a prior disposable **synthetic** PSBT QR display; it is not the current genuinely funded regtest PSBT.

## Directly observed facts
- Self-contained HTML; seven embedded PNG data URLs and seven literal `ur:crypto-psbt/<index>-7/<bytewords>` frame strings.
- Every encoded frame string is 135 characters, with `1-7` through `7-7` indices.
- On-page description: fixed-length BC-UR fountain fragments, seven times 41 bytes, padding in last part trimmed by message length. **This is the page's claim, not yet an independently decoded encoder specification.**
- UI displays each PNG with 1.5-second timer; pause, resume, previous and next controls. QR image rendered at 477px, with page claiming fixed QR version 7 and four-module quiet zone.
- Page's stated unsigned PSBT SHA-256: `ee120308ac348227d0f249662ed52108c0ca4f183be6baa9517d7caf35818544`; this matches the previously recorded 283-byte synthetic unsigned V7 fixture digest.
- No external HTTP(S) URL literals found in inspected HTML. Local browser use is not needed for these checks.
- Previous captured Jade V7 test evidence records that Jade scanned these seven parts and returned a signed synthetic PSBT, independently verified in `Professional/jade-v7-captured-signed-cltv.check.mjs`.

## What is NOT established
- Whether the existing frame encoder supports the **313-byte** funded-regtest PSBT without adaptation.
- Whether the on-page `ur:crypto-psbt` strings and PNG pixels are mutually consistent; this requires actual pixel QR decoding and bytewords/CBOR/UR reassembly.
- Whether an encoder can produce fresh, protocol-correct, **device-compatible** BC-UR fragments, including fountain header/CRC, from the new 313-byte PSBT.
- Whether Jade will sign the actual funded CLTV PSBT, whether its return QR will decode, or whether the signed transaction will pass regtest consensus.

## Next software-only gate
Implement a reproducible, dependency-pinned, offline reference decoder test: extract all seven frame strings and QR PNGs; decode each PNG; assert pixel content equals corresponding literal frame; decode BC-UR/bytewords/CBOR/fountain payload; reconstruct the exact 283-byte recorded unsigned PSBT and SHA-256. Then use the same verified protocol implementation to encode the separately verified 313-byte funded regtest PSBT, roundtrip through generated QR pixels, and assert full byte equality and negative tamper tests. Do not represent custom `BC1Q21-PRO-REGTEST-QR-V1` frames as hardware compatible.

## Safety boundary
Professional isolated branch only; Jade OFF; no device access, keys, real Bitcoin, main, retail, Start9, deployment, or broadcast. Professional NO-GO for real funds.
