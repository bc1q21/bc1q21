# bc1q21 Professional — Development Handoff (2026-10-31)

## Scope and safety boundary
Repository: bc1q21/bc1q21
Development branch ONLY: professional/isolated-release-prototype
Never modify Retail, main, or production as part of this work.
Professional is an isolated, disposable Bitcoin Core regtest prototype, not a live BTC product. No customer payments, no live broadcast, and no production deployment are authorized.

## Product goal
Build the Professional adviser/white-label gift flow: Plan -> Recovery -> Add Funds -> Jade Plus -> Finish. Preserve the separate, already-live Retail product. Professional is designed around Blockstream Jade Plus air-gapped QR PSBT signing and Bitcoin L1 time-locked gifts. Physical Jade Plus/regtest feasibility, including a 24-release redemption demonstration, was previously completed. Focus future work on working product integration, not repeating feasibility demonstrations.

## Implemented components (existing before this session)
- Professional/index.html: adviser/brand entry.
- Professional/retail-mirror/index.html: plan/recovery preview; sessionStorage key bc1q21-professional-approved-plan-preview; format bc1q21-professional-retail-plan-preview-v1; unfunded, not signing-authorized.
- Professional/funding-workspace.html: regtest funding scan, public xpub address, unsigned distribution PSBT construction, gift output derivation and Jade handoff.
- Professional/jade-signing-workspace.html: unsigned PSBT/intent verification, animated QR, camera capture of signed QR, cryptographic signature verification and transaction finalization. Raw finalized transaction is not yet passed to a server transaction endpoint.
- Professional/finish-workspace.html: receipt and delivery checklist, explicitly warns not broadcast/confirmed.
- Professional/creator-signed-qr-verification-gate.mjs and verify-signed-funded-distribution.mjs: cryptographic Jade verification and finalized transaction extraction.
- Professional/trusted_core_funding.py: Core UTXO validation and restricted read-only local RPC.
- Professional/regtest_transaction_acceptance.py: server-side acceptance, intent reconciliation, confirmation, dedicated localhost RPC transport and broadcast primitives. This is not a wired live service.

## Session code changes, in order
1. 5d0ee86 — regtest transaction acceptance inspection via decoderawtransaction and testmempoolaccept (earlier session boundary).
2. 37ae3c1 — regtest broadcast function with trusted authorization callback; confirmation inspection function.
3. f12de61 — authenticated loopback-only Bitcoin Core RPC transport for transaction inspection, submission and confirmation.
4. 2a296dc — independent comparison of decoded Core transaction against gift intent funding outpoints, output scripts and amounts.
5. e1db39e — corrected expected output ordering to gifts -> service fee -> change, matching unsigned-funded-distribution-psbt.mjs.
6. 5760490 — added server-trusted intent loader and fresh funding verification integration entry (inspection-only).
7. 696f907 — allowed bounded gettxout calls in dedicated transaction RPC transport.
8. e9d7a4a — reconciled complete satoshi ledger and network fee, with basic locktime metadata validation.
These commits were reported successful. Verify branch state before making further changes.

## Current blocker (IMPORTANT)
Repeated attempts to append submit_regtest_distribution_with_trusted_approval(...) to Professional/regtest_transaction_acceptance.py were rejected by the tool layer with: "This tool call was blocked by OpenAI's safety checks. Please double check what you are sending."
The message is NOT evidence that GitHub itself rejected a commit, that permissions are broken, or that the repository is damaged. Several retries failed. No commit was made for this attempted function. Do not assert that this is a temporary GitHub outage or try to circumvent safeguards. At next session, first diagnose whether ordinary non-transaction GitHub writes work and whether this specific content is disallowed. Work on independently safe inspection, status reporting, tests or interface integration as appropriate.

## Security/functional issues requiring attention before ANY broadcast
- A trusted intent loader is only an interface; no server-owned authenticated intent store has been connected. Browser sessionStorage or JSON approval flags are NOT trusted authorization.
- Wallet identity, hardware signer binding, gift script/CLTV validation and recipient recovery readiness are NOT fully independently attested by server code.
- The current broadcast_verified_regtest_transaction function accepts a generic authorize callback. A callback that merely checks raw hex and txid equality does not provide independent authorization. Do not deploy a superficial callback.
- The dedicated RPC transport permits sendrawtransaction; ensure it is only reachable by a genuinely authorized trusted service and not exposed directly to the browser.
- inspect_regtest_transaction_against_intent checks locktime metadata only superficially; script-level CLTV/recovery validation remains.
- inspect_regtest_distribution_for_authorization calls verify_funding_with_core using the trusted RPC; check imports/runtime wiring and realistic regtest behavior.
- A valid Core mempool acceptance result is point-in-time and not a guarantee of eventual broadcast or confirmation.
- The Jade page has finalizedRawTransactionHex available after verification, but currently stores only a summary; a secure transport/handoff to the backend remains to be built.
- No verified end-to-end integrated broadcast/confirmation test has been performed for this implementation.
- Never claim Professional is production ready.

## Next work session
1. Inspect branch HEAD and existing Professional implementation; do not repeat old tests unnecessarily.
2. Resolve or route around the blocked write by legitimate means (diagnose, not bypass safeguards).
3. Implement a genuine server-controlled intent and signer/recipient validation design; preserve fail-closed boundaries.
4. Connect inspection and confirmation status to Professional workflow, without enabling untrusted broadcasting.
5. Build targeted unit/integration tests; then perform disposable regtest end-to-end testing when safe and available.
6. Continue user-facing flow polish only after core transaction integration is sound.

## Working style
User wants autonomous substantive coding, concise progress, exact commit SHAs, and clear statements of what is tested vs only committed. Avoid repetitive tests and documentation-only churn. User requested end-of-day shutdown and a complete handoff for a fresh chat.
