# Bitcoin Core regtest CLTV consensus acceptance — controlled plan (2026-10-15)

**Scope:** bc1q21 Professional isolated prototype ONLY. No `main` changes, retail deployment, public network broadcasts, funded wallets, seed phrases, or reusable secrets. Jade Plus stays powered off until a separately approved hardware test.

## What is already proven

GitHub Actions run #263 (commit `f60c48e`) explicitly ran `jade-v7-captured-signed-cltv.check.mjs`: 3 passed, 0 failed. It verified the captured disposable Jade V7 PSBT, locally finalized a legacy P2SH CLTV `scriptSig`, and rejected a tampered signature. Existing `independent-cltv-script-validation.check.mjs` checks P2SH hash, locktime, and CHECKSIG against a synthetic funding fixture but expressly reports `fullConsensusValidation: false`.

## Critical fixture limitation

The captured V7 transaction spends a **synthetic fabricated funding transaction**, not an output mined into any Bitcoin Core regtest UTXO set. The signed input commits to that exact synthetic funding outpoint. Therefore it **cannot** be submitted as a valid regtest spend as-is, even if its signature and script are internally consistent. A rejection for missing/spent inputs would not prove a CLTV problem. Do not change the signed outpoint and claim the Jade signature remains valid.

## Next controlled hardware-signed validation (NOT YET EXECUTED)

1. Create a disposable isolated Bitcoin Core `-regtest` datadir and wallet. Never point to the user's Start9 node, production RPC, or mainnet/testnet/signet. Verify `getblockchaininfo.chain == "regtest"`.
2. Generate mature regtest-only coinbase funds, construct and confirm an actual P2SH output matching the known redeem script; record its genuine txid, vout, amount, scriptPubKey, and confirmation.
3. Build a new unsigned legacy P2SH CLTV spend of that **real regtest UTXO**, with `nVersion >= 2`, `nLockTime >= CLTV threshold`, and nonfinal input sequence. Match expected fee and destination and independently inspect the PSBT.
4. Sign **that new outpoint** with an authorized disposable signer only, using the established offline QR protocol; no recovery words/keys through bc1q21. Existing V7 signature cannot be reused.
5. Finalize and call Bitcoin Core `testmempoolaccept` on **regtest only**, checking the actual `allowed` and `reject-reason`. To demonstrate block consensus, optionally mine a regtest block containing the accepted spend and verify the resulting UTXO state. Regtest mining/broadcast are strictly local to this disposable network, only after explicit authorization.
6. Negative tests: locktime below threshold, final sequence, altered signature, incorrect redeem script, and mismatched output. Distinguish signature failure from missing-input and non-finality failures. Ensure height/time lock type and current chain tip are consistent.
7. Preserve redacted commands, chain identifier, raw test results, test versions, and hashes in this isolated branch. No automatic claim of H-06 PASS: multiple-release and device-boundary acceptance remain open.

## Decision and immediate next engineering work

**H-06 PARTIAL / overall NO-GO.** First build a repeatable, fail-closed regtest harness with explicit `regtest` chain assertion and disposable datadir; avoid asking the user to turn on Jade until the fixture construction and validation flow are ready. GitHub Actions regtest workflow #8 has demonstrated Bitcoin Core 28 mempool acceptance for a genuinely funded CLTV output using disposable software signing; hardware signing of that genuine UTXO remains untested.

## Reconciliation: real regtest software-signer acceptance already passed

The pre-existing isolated GitHub workflow `.github/workflows/professional-bitcoin-core-regtest.yml` completed [run #8](https://github.com/bc1q21/bc1q21/actions/runs/38427524114) successfully on 2026-10-13 (commit `498ce7e`). Independently inspected GitHub job records confirm both `Execute Bitcoin Core script acceptance tests` and `Execute integrated Professional public-only funded regtest acceptance` passed. This satisfies the **software-signed genuine-regtest UTXO** portion of the above plan, not the Jade-signed portion. The workflow's disposable Bitcoin Core container is ephemeral; its mined regtest UTXOs disappear when the job ends. The Jade cannot sign the earlier V7 fabricated outpoint or reuse a signature for a newly funded outpoint.

## Safe next milestone: preserve a real regtest PSBT across offline hardware approval

1. Build a **manual, deliberately paused** isolated test workflow which creates and funds a real P2SH CLTV output using the disposable Jade public key, derives the unsigned PSBT from public data, and exports the exact unsigned PSBT plus funding transaction and chain-state evidence. It must not contain the Jade seed, private keys or any production wallet material.
2. Because the GitHub runner and Bitcoin Core regtest chain are ephemeral, **do not** claim a later Jade-signed return can be validated against the destroyed original chain. Either keep a dedicated, explicitly disposable regtest environment available until return, or export/replay sufficient validated regtest chain state in a separately reviewed procedure. Avoid artifacts containing RPC credentials, private keys, wallet.dat or sensitive user information.
3. Only after public transaction details, transport and chain continuity are verified should the user be asked to turn on the disposable Jade Plus and review/sign the **new** PSBT by QR. A signed PSBT must be compared byte-for-byte to the approved unsigned transaction and checked for signatures before any regtest RPC validation.
4. Run `testmempoolaccept` against the same genuine regtest chain and outpoint, preserve explicit result and negative tests, and update H-06 only to the degree supported by evidence. No public network broadcast and no real Bitcoin.

**Hold point:** hardware interaction is not authorized by this document. The next engineering task is designing the chain-continuity and public-only PSBT export boundary; no Jade action is currently required.
