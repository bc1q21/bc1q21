# bc1q21 Professional — Durable Replay and UTXO Verification Requirements

**Status:** Architecture requirements, NOT implemented production controls. **Scope:** isolated Professional prototype only; synthetic/regtest; no broadcasts, real BTC, real seeds, or deployment.

## Verified prototype behavior

The optional `createLocalDurableProfessionalReplayGuard(directory)` uses exclusive file creation (`openSync(...,'wx')`) for an outpoint claim. Cooperating processes on the same local filesystem cannot both create the same filename. Claim records are retained even when the signed PSBT return is rejected. `has()` validates stored records, and malformed records raise errors rather than being treated as absent. The controlled session accepts the guard as an optional argument; it is **not mandatory**.

Regression `local-durable-replay-guard.test.mjs` covers reopening a guard, a separate process, eight competing Node processes, damaged claim contents, and invalid public outpoints. GitHub Actions run https://github.com/bc1q21/bc1q21/actions/runs/38602224060 succeeded for commit `7e897bac455dfc10d8535ece10aff66ed741713d`.

**What this does not establish:** power-loss durability, directory fsync, trusted permissions and ownership, tamper resistance, symlink/path substitution safety, multi-host coordination, atomic recovery, process crashes at every write point, full storage exhaustion handling, blockchain UTXO availability, transaction confirmation, or actual broadcast acceptance. A created file may exist but contain an incomplete record after a crash; it must remain a blocking claim, not be silently recycled.

## Production decision: persistent state and idempotent transitions

Use a single authoritative transactional persistence service (for example a properly configured ACID database) with a **unique constraint** on `(network, funding_txid, vout)`, durable commits and explicit migration/backups. All cooperating app instances must share this authority; never assume a local disk lock works across containers, hosts, or replicas. Reject mismatched networks. Never persist seed words, private keys, signed wallet secrets, or unneeded sensitive wallet data.

Maintain an auditable state machine, such as:
`UNCLAIMED -> RESERVED -> SIGNED_RETURN_VERIFIED -> FINALIZED_OFFLINE -> EXTERNALLY_SUBMITTED -> CONFIRMED`.
The current prototype stops at `FINALIZED_OFFLINE`; **no external submission or broadcast is authorized**. A failure is a distinct `REVIEW_REQUIRED` state, not automatic release of a reservation. Record timestamps, approved PSBT fingerprint, immutable approved outpoint/intent, final txid when available, and narrowly scoped failure codes; avoid storing signing secrets.

Use a database transaction for claim acquisition and uniqueness, plus an idempotency token for retries. Bind every transition to the same immutable approved transaction intent and authenticated actor. Concurrent callers must not both advance the same claim. Define crash-safe retry and operator recovery paths, with an audit trail; never delete or recycle a claim solely because a client timed out. Test durable restoration from backups and conflicting restored state before production.

## Independent Bitcoin chain-state checks

Before approving a real release, an independent trusted Bitcoin node must establish that the funding outpoint exists, belongs to the expected redeem script and amount, and is currently unspent on the intended network. Verify the funding transaction's confirmation policy, current chain height/median-time-past as applicable, CLTV type and maturity, sequence, fee policy, and reorganization exposure. Distinguish an unspent UTXO from a mempool-conflicted or already-spent outpoint. Re-check chain state before any eventual submission; this check is time-sensitive and **cannot replace** the persistent uniqueness constraint. If the node is unavailable, inconsistent, or out of sync, fail closed.

For offline/regtest acceptance work, verify finalized transaction structure and cryptographic signatures independently, and where appropriate use Bitcoin Core `testmempoolaccept` against disposable regtest data **without calling `sendrawtransaction`**. Core acceptance is a snapshot, not a broadcast or confirmation guarantee.

## Recovery and failure policy

- Crash after reservation but before signing: retain reservation; require authenticated, auditable reconciliation.
- Crash during claim persistence: treat any ambiguous or malformed record as occupied; stop automatic processing and require review.
- Invalid or malicious signed return: consume that session attempt; retain the outpoint claim; do not silently retry or roll back.
- Finalized transaction without confirmed submission: retain raw transaction identifier and verified audit evidence; never infer on-chain settlement.
- Conflicting chain data, reorg, mempool conflict or possible double-spend: stop processing and require node-backed reconciliation.
- Lost database or restored backup: block releases until state is reconciled with authoritative storage and current Bitcoin node; backups alone do not prove a UTXO is available.
- Manual override: require documented authorization, audit log, and independently verified evidence; do not provide an automatic "clear claim" button.

## Acceptance criteria before production consideration

1. Atomic claim uniqueness under real multi-instance concurrency and database restarts.
2. Recovery from process termination at every state transition, torn writes, corrupted storage, and backup restoration.
3. Verified refusal of stale, duplicated, replaced, spent, immature, wrong-network or conflicting funding outpoints.
4. Exact approved-intent binding and independent final raw-transaction audit across all supported release types.
5. Explicit authentication, authorization, tamper-evident operational audit and incident recovery procedure.
6. Regtest Bitcoin Core verification and disposable offline Jade Plus end-to-end QR flow, without broadcast.
7. Independent security review before any production launch or live Bitcoin testing.

**Next engineering task:** complete the disposable regtest Jade Plus QR signed-return roundtrip, independently verify with Bitcoin Core without broadcasting, and keep retail bc1q21 and `main` untouched.
