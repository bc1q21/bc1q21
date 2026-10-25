# bc1q21 Professional — Physical Jade Plus acceptance milestone and session closure
**Date:** 2026-10-25  
**Status:** PHYSICAL JADE SIGNATURE + ORIGINAL FUNDED BITCOIN CORE REGTEST ACCEPTANCE **PASS**. Full Professional website/recipient UX **NOT YET COMPLETE**.

## Definitive evidence
- Successful workflow: `Professional physical Jade exact calendar gift acceptance`, run **40218726393** (commit `6cd551dbaacf3c1800276a4ac8b899edbc9f6892`), conclusion **success**.
- Workflow definition: `.github/workflows/professional-calendar-jade-final-acceptance.yml`.
- It downloads the **exact original** public handoff and saved regtest chain from run **40216032293** (artifact `professional-calendar-regtest-public-handoff`, artifact ID **12607382146**, retention expires 2026-11-01). It does not generate a different gift.
- Signed physical Jade QR fixture: `Professional/fixtures/calendar-release1-physical-jade-signed-qr-20261025.txt`. Contains PUBLIC disposable regtest PSBT QR frames; **no seed or private keys**.
- CLI: `Professional/verify-calendar-jade-return.mjs`, verifies exact approved PSBT, signature and Bitcoin Core `testmempoolaccept` with **NO BROADCAST**.
- Actual successful job log:
  ```
  PASS_PROFESSIONAL_EXACT_CALENDAR_JADE_RETURN {"network":"regtest","txid":"d8556efbc7786ee4fb5b5a4b14bb740cbf757029b5a7a9899c8b8c679ce0305f","signatureVerified":true,"bitcoinCoreAccepted":true,"broadcast":false}
  ```
- Original funded gift TXID: `9c7d4a5ef6fb08e739518a4006cb8186414d95fa385dd7a2ada0552dd8b79695`. Two CLTV releases: 100,000 sats due 2023-11-14; 200,000 sats due 2023-12-14. Release 1: 99,000 sats beneficiary payout, 1,000 sats fee. Disposable regtest, historical locktime.
- Jade Plus used the original 12-word **test** recovery phrase directly on device. User scanned animated unsigned QR, verified payout/fee on Jade, signed OFFLINE, and captured animated signed QR with an older working standalone local capture page. No phrase, private keys, or real funds shared with ChatGPT or website.

## Failed intermediate run and correction (do not misinterpret)
- Run **40218596040** failed with `Returned unsigned transaction differs from approved transaction`. Cause: it compared the physical Jade signature from the **original gift** to a **freshly generated different regtest gift**. This was test-fixture mismatch, not a failed Jade signature.
- Fixed by dedicated original-snapshot workflow above; PASS run **40218726393**.
- Standard `.github/workflows/professional-bitcoin-core-regtest.yml` restored to its fresh-fixture CI purpose by removing the inappropriate physical Jade verification step, commit **de4a30e6a94d2c4b61a560e7e7f4b5cd676c80aa**. Dedicated original-gift workflow is authoritative for physical Jade acceptance.

## Architecture / guardrails
- **Only** branch `professional/isolated-release-prototype`. Work only within `Professional/` and `.github/workflows/professional-*.yml`. **NEVER touch Retail, main, production/deployment, Website, Backend, Frontend.**
- bc1q21 Professional is separate from stable bc1q21 Retail, intended to reproduce Retail feature-for-feature with offline hardware signing. One Jade Plus signer; one original 12-word test wallet; no seed/private key exposure.
- Gift dates and public beneficiary links may be visible (Option B), but all private signing stays offline on Jade. Bitcoin CLTV script enforces maturity.
- **NO MAINNET, NO BROADCAST, NO REAL FUNDS** in current acceptance/development; use disposable regtest only. No unauthorized signing.

## Next session priority — UX integration
The **cryptographic signing architecture has been demonstrated successfully**, but the user-facing Professional website is not finished.
1. Fix the **recipient preview camera**: local `two-release-calendar-recipient-preview.html` showed both gift dates and animated unsigned QR correctly, but its **Scan signed Jade QR** camera view stayed black when opened locally from `file://`. In contrast, `bc1q21_Jade_Signed_PSBT_QR_Capture.html` opened in Brave and successfully captured 10 distinct `crypto-psbt` frames. Investigate camera permissions / secure-context / JS initialization / scanner integration rather than assuming root cause.
2. Incorporate the known-working signed-QR capture into the Professional recipient page and implement in-browser reconstruction, exact-PSBT identity check, cryptographic signature verification and finalization. Ensure wrong-gift signatures are rejected. User should not need a separate capture page or manual file exchange.
3. Maintain the Retail-like gift creation, beneficiary link, calendar release visibility and polished workflow. Test real hardware UX with user only when necessary; user prefers **one physical instruction at a time**.
4. Maintain regression checks for wrong gift, wrong signer, tampering, locktime, address, fee, partial QR frames, camera errors and **no broadcast**. Do not equate `testmempoolaccept` with broadcast or production readiness.
5. Artifact retention: original run's archived snapshot may expire 2026-11-01. Before expiry, consider preserving a **safe reproducible, public-only disposable fixture** or documented regeneration mechanism. Do not commit secrets, chain wallet files or large blockchain data.

## Next chat startup
Read this checkpoint first, inspect the two workflows and the successful run **40218726393**. Confirm current Professional branch state and any CI status before editing. **Do not redo hardware signing** or confuse the original signed gift with a newly funded fixture. Proceed to fix the recipient camera / integrated signed-QR UX in small, independently verified changes. Keep GitHub state authoritative and user informed concisely.
