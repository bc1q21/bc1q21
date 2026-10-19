# Professional isolated prototype — session handoff (2026-10-19)

## Scope / guardrails
- Repository: `bc1q21/bc1q21`; authorized branch: `professional/isolated-release-prototype`.
- Only modify `Professional/` and `.github/workflows/professional-*.yml`. Never modify retail, `main`, production deployment, Start9 or real Bitcoin/mainnet.
- Non-custodial and offline signing remain mandatory. No seed words, private keys, wallet-derived AES secrets or signing secrets in browser, source, logs or CI. Original 12-word backup must remain sufficient for recovery.
- Owner approved Option B for Professional only: anyone possessing a Professional gift QR/link may view public release dates; this is **not** spending authority. Retail date privacy is unchanged.
- Do not repeat previously proven physical Jade Plus tests unnecessarily.

## Confirmed acceptance evidence
- Physical Jade Plus approved one creator 24-output funding PSBT with change; signed QR independently verified; **not broadcast**.
- Physical Jade Plus signed four separate disposable regtest CLTV release PSBTs; Bitcoin Core rejected premature spends and accepted matured spends.
- Professional offline gift-specific Option B page/route-manifest and public funding-locator-to-CLTV schedule mapping have automated tests, but metadata authentication and live routing are not established.
- Professional one-gift raw funding transaction binding tests passed in GitHub Actions run #457, commit `2ee6e2f`.
- Two new files `Professional/one-gift-core-utxo-continuity.mjs` and `Professional/one-gift-core-utxo-continuity.check.mjs` were committed in `dfd2b28`. The tests were added to `.github/workflows/professional-tests.yml` in `20f5c37`; run #459 failed due solely to an incorrectly ordered expected field-name array in a sorted-key comparison.
- The sorted-key comparison was corrected in commit `980cc6626d5480460b31645d2ca997708b16b4d1`; **GitHub Actions Professional isolated PSBT tests run #460 (39297905676) completed SUCCESS**: https://github.com/bc1q21/bc1q21/actions/runs/39297905676 .
- These are caller-supplied Core-like observations, **not authenticated RPC evidence**. Module deliberately reports `rpcProvenanceVerified:false`, `chainVerified:false`, `authenticated:false`, `recipientAuthenticated:false`, `readyForLiveRouting:false`, `canSign:false`, `canBroadcast:false`.

## Outstanding before Professional acceptance
1. Independently authenticate the funding locator, release scripts, public schedule and actual gift identity, not just caller-supplied matching data.
2. Establish authenticated regtest Bitcoin Core RPC transport/provenance and confirmed, unspent funding UTXOs with chain-tip continuity; preserve fail-closed behavior for spent/missing/reorg cases.
3. Construct the **same gift's** recipient release PSBT from independently verified funding evidence and proper CLTV maturity.
4. Integrate offline Jade Plus QR signing, verify returned signed PSBT, and gate broadcast on independently verified conditions; never grant authorization from a QR locator alone.
5. Prove one coherent creator-to-recipient regtest lifecycle and backup/recovery sufficiency; perform security review before any live deployment.

## Next-session priority
**Stop accumulating isolated synthetic tests.** Inspect existing creator funding binding, Bitcoin Core adapters, recipient PSBT/QR modules and build a single integrated **regtest-only, one-gift** acceptance harness with explicit trusted/untrusted evidence boundaries. Reuse already demonstrated Jade hardware behavior; do not claim real on-chain provenance from caller-supplied fixtures. First inspect the current branch and recent CI; then implement one meaningful integration increment and verify GitHub Actions. No deployment or mainnet transaction is authorized.

## End-of-session status
Clean planned stopping point: latest tested commit `980cc66` is green in run #460. No outstanding known CI failure at this checkpoint. Fully integrated lifecycle is **not** complete; no live Professional release or production rollout approved.
