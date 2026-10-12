# Bitcoin Core consensus-validation gate — isolated Professional prototype

Status: **EXECUTED AND PASSED on regtest** (see verified results below). The synthetic Jade Plus PSBT finalizes and passes known-template script checks, but its referenced funding output is fabricated and does not exist in any Bitcoin Core UTXO set. Consequently, submitting that transaction to `testmempoolaccept` would produce a missing-input result; it would **not** establish whether its P2SH/CLTV script passes Bitcoin Core consensus checks.

## Verified acceptance result — 2026-10-12

**PASSED** on GitHub Actions run [38291439270](https://github.com/bc1q21/bc1q21/actions/runs/38291439270), Bitcoin Core container `ruimarinho/bitcoin-core:28`, disposable regtest. The run executed `testmempoolaccept` only; it did not broadcast a spending transaction.

| Case | Expected | Observed | Core reason |
|---|---|---|---|
| Valid P2SH CLTV spend | Accept | Accepted | null |
| Locktime 109 below required 110 | Reject | Rejected | Locktime requirement not satisfied |
| Final input sequence | Reject | Rejected | Locktime requirement not satisfied |
| Invalid signature | Reject | Rejected | Signature must be zero for failed CHECK(MULTI)SIG operation |
| Signed output modified | Reject | Rejected | Signature must be zero for failed CHECK(MULTI)SIG operation |
| Incorrect redeemScript | Reject | Rejected | Script evaluated without error but finished with false/empty top stack |

**Scope:** These are Bitcoin Core regtest mempool/script policy acceptance checks for a separate regtest-backed transaction, not validation of the original Jade Plus synthetic PSBT against a real UTXO. They do not establish full product security, production readiness, mainnet behavior, or correctness of a future commercial signing flow. No retail deployment or branch merge is authorized.

## Acceptance-test procedure (completed)

1. Provision an ephemeral Bitcoin Core **regtest** node in CI or another disposable environment. Use no mainnet wallets, addresses, keys, or funding.
2. Generate a **regtest-only** spendable UTXO using a deterministic disposable fixture and mature any coinbase funding as required.
3. Construct a P2SH output with the exact supported redeemScript shape: `<CLTV-height> OP_CHECKLOCKTIMEVERIFY OP_DROP <compressed-pubkey> OP_CHECKSIG`.
4. Create a matching version-2 spending transaction with a nonfinal sequence, appropriate nLockTime, and a regtest-only destination. Independently verify the output amount and fee.
5. Sign with a **disposable regtest-only** test key, finalize, and submit the raw transaction to Bitcoin Core's `testmempoolaccept` RPC (without broadcasting).
6. Require `allowed: true` for the valid fixture. Test separately that early locktime, final sequence, invalid signature, incorrect redeemScript, and mutated output are rejected; capture `reject-reason` for each.
7. Record the Bitcoin Core version, test fixture identifiers, RPC outputs, and CI run URL.
8. Do not treat the test as proof of mainnet production readiness: further review is required for real UTXO handling, signer UX, fee policy, time/height semantics, and operational threat model.

## Explicit safety boundary

- All work stays on `professional/isolated-release-prototype`; never merge to `main` or deploy retail.
- Never broadcast, even on regtest, during this gate.
- Never load a real seed, hardware-wallet secret, or mainnet funded transaction.
- **The earlier Jade Plus signed synthetic PSBT cannot be directly Bitcoin Core validated** because its referenced funding output is not present in Core's regtest chain. A separate regtest-backed fixture is required.
- The existing independent checker validates only the fixed known P2SH/CLTV script template; it is not a full Bitcoin script interpreter.
