# bc1q21 Professional — End-of-day engineering handoff (2026-10-22)

## Scope and operating rules
- Repository: `bc1q21/bc1q21`; authorized branch ONLY `professional/isolated-release-prototype`.
- Authorized paths ONLY `Professional/` and `.github/workflows/professional-*.yml`. Never change `main`, retail `Frontend/`, production, live deployment, nginx or Start9.
- Regtest only. No real BTC, transaction broadcasting, real seed words, xprvs or secrets in website, GitHub, CI, chat or server. Jade Plus remains OFF until one meaningful, explicitly approved acceptance test.
- Professional must preserve retail creation, calendar schedules, gift card and recipient UX, but signing/private operations remain air-gapped. Public gift link is not spend authorization. Creator gives original 12 words separately and privately.

## Hardware baseline already proven — do not repeat
On October 20 the physical air-gapped Jade Plus signed the first release of the SAME funded 24-output CLTV regtest gift, using disposable seed restored offline, unsigned animated QR (19 frames), signed QR return (7 frames), 12,000-sat input, 11,000-sat payout and 1,000-sat fee. Independent ECDSA verification succeeded (Actions 39480906529) and Bitcoin Core 28 `testmempoolaccept` accepted the finalized transaction without broadcast (Actions 39481114223). This was a height-based CLTV hardware proof, NOT a complete calendar-date beneficiary flow.

## Completed Professional software work
- Regtest-only local credentialed read-only Core transport and internal 24-output gift verification, chain-tip stability, selected output amount/script/UTXO consistency; no caller-supplied `giftEvidence` accepted by the restricted local entry point.
- Exact selected gift output and unsigned PSBT confirmation binding; destination, fee, amount, locktime, transaction fingerprint.
- CLTV maturity against Core tip: height next-block semantics and timestamp locktime requiring Median Time Past STRICTLY GREATER than the timestamp.
- One-time exact fingerprint beneficiary confirmation; private in-process approval receipt provenance; consumed before asynchronous freshness check; rejects stale/spent outputs, wrong release, changed chain tip.
- Restricted beneficiary review facade; never exposes legacy QR export, signing or broadcasting. The older standalone QR prototype has an independent approval mechanism and MUST NOT be allowed to bypass these checks.
- Deterministic public gift commitment `Professional/public-gift-binding-commitment.mjs` covers regtest funding txid plus ordered output index/vout/sats/scriptPubKeyHex; mandatory independent `expectedBindingDigest` in `Professional/locally-verified-beneficiary-review.mjs`. SHA-256 commitment detects tampering but does NOT authenticate creator or recipient.
- Creator-to-recipient public fingerprint notice and strict recipient comparison in `Professional/public-gift-commitment-notice.mjs`; documentation `Professional/PUBLIC-GIFT-COMMITMENT-HANDOFF.md`. Fingerprint is public; never include seed words.

## Latest CI and syntax correction
- Last fully GREEN branch checkpoint BEFORE public notice work: Actions **39874596318**, commit **55c4082**.
- Subsequent notice commits: `5f9818a` (notice), `952d518` (tests), `7101633` (documentation). Tests failed because `Professional/public-gift-commitment-notice.test.mjs` had a missing closing parenthesis in a test fixture, NOT because a security check accepted invalid data.
- Fix committed as **f82c969732789890dd2698c6c4989cf3b95c68c3** (corrected `repeat(20)`).
- Actions run **39874970493** was automatically CANCELLED on its first attempt. Explicit job rerun requested successfully; at last observation run **39874970493**, attempt **2**, was **in_progress**. DO NOT report it green until verified.
- On next session FIRST query Actions status for branch head and inspect job logs if red. Do not add further feature code before confirming green; avoid needless commits that cancel earlier CI runs. If rerun fails, fix the actual logged issue and rerun.

## Immediate next tasks — in order
1. Verify GitHub Actions run **39874970493**, attempt 2, on `f82c969`. If failure, inspect logs, correct only demonstrated defects and get one fully green run.
2. Inspect/validate the public commitment against the ORIGINAL funded 24-output regtest gift, not merely a synthetic 24-output test fixture. Determine whether exact original public gift binding and independently retained original fingerprint exist. If not, document missing fixture/provenance explicitly; do NOT invent original gift commitment or imply the original creator already received one.
3. Strengthen recipient comparison and original-gift commitment provenance, including clear distinction between independent channel and same compromised website. Verify fail-closed mismatch with tests.
4. Audit the local RPC, gift binding, approval and restricted QR facade as a coherent trust boundary. Currently approval provenance is in-process only; chain provenance is local credentialed RPC, not independent attestation; neither establishes recipient identity.
5. Design the restricted controlled-QR export so only genuine internally issued, single-use authorization after fresh same-tip regtest verification may access the exact approved PSBT. Do not simply flip `canExportSigningQr` or expose standalone `createControlledQrSession().approve()` as an alternate path.
6. When software acceptance and trust boundaries are green, propose ONE final beneficiary air-gapped Jade Plus end-to-end acceptance (prefer original 24-release gift, calendar timestamp CLTV) and seek explicit user permission. No repeated already-proven Jade test.

## Relevant entry points
- `Professional/locally-verified-beneficiary-review.mjs`
- `Professional/public-gift-binding-commitment.mjs`
- `Professional/public-gift-commitment-notice.mjs`
- `Professional/restricted-beneficiary-qr-boundary.mjs`
- `Professional/fresh-gift-approval-sequence.mjs`
- `Professional/internal-gift-approval-provenance.mjs`
- `Professional/approved-gift-freshness-preflight.mjs`
- `Professional/fresh-approval-qr-boundary.mjs`
- `Professional/controlled-qr-session.mjs`
- `Professional/SESSION-HANDOFF-2026-10-21-END-OF-DAY.md`
- `Professional/RETAIL-PARITY-GUARDRAIL-2026-10-21.md`

## Status at handoff
Professional is a research/regtest prototype, NOT beneficiary-ready, NOT production-ready. No QR export or broadcasting enabled in the integrated beneficiary flow. Retail and production untouched. The original 24-output Jade hardware proof stands; calendar timestamp beneficiary flow and full 24-output provenance remain to be accepted.

## Tomorrow's instruction
Read THIS handoff and latest CI result first. Do not repeat previously passed hardware testing or build redundant wrappers. Work on the isolated branch autonomously within scope, keep changes small, confirm CI after commits, and report real limitations candidly. User prefers one meaningful step at a time and minimal manual intervention.
