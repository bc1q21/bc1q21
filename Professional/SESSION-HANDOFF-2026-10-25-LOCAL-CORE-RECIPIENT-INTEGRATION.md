# bc1q21 Professional — session handoff, 2026-10-25

## Branch and safety boundary
Repository: bc1q21/bc1q21. Work ONLY on `professional/isolated-release-prototype`. Never modify Retail or `main`. All fixtures and tests use disposable Bitcoin **regtest**; no mainnet BTC, no broadcasting, no seed words. User wants Retail stabilized independently and a later Professional version with offline Jade Plus signing. Proceed with GitHub tools without asking user to repeat permission; user prefers one step at a time if manual action is needed.

## Product target
Retail-like gift creation and recipient/release UX; Professional recipient uses one wallet and one 12-word recovery phrase, with spending keys held offline on Jade Plus. Gift-specific recipient link is a **public locator**, not spend authority. Selected mature release -> independently verified funding + provenance + CLTV maturity + explicit beneficiary review/approval -> transaction-specific PSBT QR -> offline Jade signature -> signed QR scan -> independent signature verification -> controlled finalization/broadcast in future. Never bypass any gate.

## What is already proven
- Oct 25 real physical Jade Plus offline regtest signed-QR import and signature verification succeeded; Bitcoin Core `testmempoolaccept` accepted disposable signed transaction, **no broadcast**. Recorded 10 QR frames: `Professional/fixtures/calendar-release1-physical-jade-signed-qr-20261025.txt`.
- `Professional/browser-integration/professional-verification-diagnostic.html` is a separate **fixed PSBT diagnostic**, not yet gift-specific. Gift URL locator display is informational only. `Professional/recipient-gift-specific-prototype.html` remains a static recipient mockup, signing button disabled. Do not imply production-ready integration.
- Browser signature verifier and virtual-camera Chromium tests were green before this session.
- New `Professional/browser-integration/verify-gift-release-binding.mjs` compares selected release funding txid/vout, locktime, payout amount/destination, SHA256 approved PSBT, and embedded funding transaction script/value. `checkGiftReleaseAgainstUtxoSnapshot` rejects spent/unconfirmed/wrong outpoint/script/value snapshots but **cannot authenticate caller-supplied RPC data**. Tests in `Professional/browser-integration/test-gift-release-binding.mjs`. Browser and PSBT workflows both green at commit `b0eb758`.
- Existing stronger read-only Core components: `Professional/local-regtest-readonly-transport.mjs` (credentialed loopback allowlisted RPC), `Professional/local-regtest-all-gift-outputs.mjs` (confirmed complete gift UTXOs, stable tip), `Professional/gift-bound-core-maturity-preflight.mjs`, `Professional/approved-gift-freshness-preflight.mjs`, `Professional/gift-bound-beneficiary-review.mjs`, `Professional/PUBLIC-GIFT-COMMITMENT-HANDOFF.md`. Avoid duplicating their roles or treating a caller-provided snapshot as trusted.

## Today's last changes and CI issue
- `5a55a67`: added `Professional/selected-release-core-preflight.mjs` composing exact selected release PSBT binding, caller-injected read-only Core `gettxout`, regtest chain/tip check and CLTV next-block maturity. Returns `canSign:false`, `canBroadcast:false`, `rpcTransportAuthenticated:false`; this is NOT a signing gate.
- `ad9f5a5`: added `Professional/selected-release-core-preflight.test.mjs` with mocked read-only Core RPC. CI failed at test line 45 because the *test* assumed `height = lockHeight - 1` was immature. Bitcoin CLTV checks the **next block height**; at current height lockHeight-1, next height equals lockHeight and is mature. Other test passed.
- `b557248`: corrected immature test case to `height = lockHeight - 2`. **Check latest PSBT CI for this commit before proceeding; it was not yet confirmed when handoff was written.** Browser workflow may not run for files outside browser-integration.

## Next session — priorities
1. Check GitHub Actions for `b557248` and this handoff commit on isolated branch; inspect logs and fix any failures. Do not claim success without checking.
2. Audit whether `selected-release-core-preflight.mjs` should delegate to existing `gift-bound-core-maturity-preflight.mjs` and `local-regtest-all-gift-outputs.mjs`, rather than remaining a parallel duplicate. Prefer a single coherent gift-specific trust chain, not endless micro-tests.
3. Bind selected release to **complete public gift evidence** and independently retained creator-provided public gift commitment; link to existing gift-bound beneficiary review and explicit approval. Existing public evidence `Professional/fixtures/original-funded-24-public-evidence.json` describes 24 releases and `Professional/fixtures/same-gift-unsigned-handoff.json` describes a specific release. **These are distinct from the fixed browser diagnostic regtest PSBT**; do not falsely claim they represent the same gift or signer.
4. Integrate verified release state into actual Professional recipient UX. Keep QR export/signing disabled until the full trusted chain, independent provenance, beneficiary approval and exact PSBT linkage are proven. Prefer user-visible functional progress to endless camera regression additions.
5. Continue safe disposable regtest end-to-end integration and report what is verified versus not verified.

## CI and GitHub tools
GitHub Actions: `https://github.com/bc1q21/bc1q21/actions`. Via GitHub connector `mcp__GitHub__fetch` on `https://api.github.com/repos/bc1q21/bc1q21/actions/runs?branch=professional%2Fisolated-release-prototype&per_page=8`. For failures use `fetch_workflow_run_jobs`, `fetch_workflow_job_logs`. Use `fetch_file`, `update_file`, `create_file` with exact branch. All changes must stay on isolated branch. The GitHub file itself is the authoritative restart record.

## Stop status
Stopped deliberately at a convenient end-of-day checkpoint. No production deploy, no Retail/main changes, no Bitcoin broadcast, no user action required tonight.
