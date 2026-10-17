# bc1q21 Professional — next four-Jade-release regtest execution gate
Date: 2026-10-17. Branch: `professional/isolated-release-prototype`.
Status: **PREPARATION ONLY — no signing QR, new regtest funding, hardware approval, or deployment is implied by this document.**

## Ground truth
- Fresh disposable Jade `ur:crypto-account` public export was captured on 2026-10-17 (six unique QR frames; no secret QR). The account was reported to match the previously saved test xpub; the public account fingerprint recorded in existing fixtures is `e29ac13c`. This session has not yet saved a reproducible independent comparison artifact in GitHub. Do not claim H-01 fully independently closed.
- One funded Jade-signed CLTV spend passed independent ECDSA verification and Bitcoin Core `testmempoolaccept` (run 38944732136).
- Four Jade-xpub-derived funding outputs passed independently on a disposable regtest (run 38947073663), **but no hardware signing** was performed on those outputs.
- Four software-key staged CLTV spends passed on a **different** disposable regtest (run 38948176903). Those outputs are not Jade spendable.
- Current green baseline: 38948725853, commit `065bcd4ab1d523e51c5ba8f4cd856c88efb21f9d` at the beginning of the 2026-10-17 session.

## Next experiment: genuine four-release Jade signing
1. Reconstruct and verify the fresh public account export against the pinned disposable xpub and origin. Record checksum, fingerprint, and the exact expected four derived child public keys, scripts, and regtest addresses for `m/84'/0'/0'/1/0` through `/1/3`. Never import or request recovery words.
2. Build a **new**, ephemeral Bitcoin Core regtest environment. Create four confirmed P2SH CLTV funding outpoints to those four distinct Jade-xpub-derived public keys. Record txid, vout, sats, redeem script, block height, and independent `gettxout` evidence. Preserve chain state for the entire hardware roundtrip.
3. Construct **four distinct** unsigned PSBTs, each referencing its corresponding new confirmed outpoint and exact BIP32 fingerprint/path, redeem script, locktime, and non-final input sequence. Review each recipient, fee, and transaction hash before QR generation. Do not reuse the old software-key outpoints or old one-spend QR.
4. Encode each PSBT into offline BC-UR `crypto-psbt` frames, with QR-pixel-to-payload roundtrip and PSBT-hash checks. Present **one transaction at a time** for explicit user authorization and Jade review.
5. Capture each Jade-signed return by QR, independently decode and verify signature(s), finalize the legacy P2SH CLTV spend, and validate with Bitcoin Core at the correct height. Test premature spend rejection with a *validly signed* premature candidate (not merely an empty unlocking script), then acceptance at maturity. Do not broadcast to a public Bitcoin network.
6. Preserve evidence: signed PSBT hashes, exact outpoint mapping, ECDSA results, Core rejection/acceptance, final transaction IDs, and evidence that no seed, xprv, or wallet-derived AES secret crossed the air gap. Hardware test is **not** equivalent to an integrated gift lifecycle.

## Separate mandatory architecture gate: retail encryption
The current retail gift encrypts the first date using `BC1Q21G1` (PBKDF2-SHA256/AES-GCM) and a SHA256 secret derived from private child `m/84'/0'/0'/0/2` plus `bc1q21-opreturn-encryption-v1`. Ordinary PSBT signing and public xpub export do not expose an interface for this custom operation. **Do not assume Jade can perform it.**
Before claiming retail parity, explicitly establish either (a) supported exact offline wallet-derived encryption and gift-bound schedule-only decryption on a candidate device, or (b) an approved independent, air-gapped offline companion that derives/uses the secret entirely offline and releases only approved public gift-bound schedule information. Do not send the secret or seed into the browser. An alternate ciphertext format or trust model requires a separate product decision.
 
## Safety boundary
No changes to retail/main, production, deployment, Start9, live funds or wallets. No public-network Bitcoin transactions. Scope only `Professional/` and approved professional workflow files. This document is a test plan, not evidence of completion or approval to sign.
