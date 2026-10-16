# Professional real-regtest air-gapped CLTV release — staged acceptance gate (2026-10-16)

**State:** ENGINEERING PREPARATION ONLY. **Hardware OFF.** No device signing authorized. No real funds or public-network broadcast. This is NOT an H-06 PASS.

## Non-negotiable isolation

- Repository `bc1q21/bc1q21`, branch `professional/isolated-release-prototype`, files only in `Professional/` and isolated `.github/workflows/professional-*.yml`.
- Do not touch `main`, retail site, production server, Start9, live wallets, DNS, public Bitcoin networks, seed words, private keys or reusable secrets.
- Disposable Bitcoin Core 28 `regtest` only; local RPC bound to `127.0.0.1`; require `getblockchaininfo.chain === 'regtest'` before any operation.
- No Jade Plus power-on, scan or signing until user separately approves the exact hardware test.
- Preserve the original retail CLTV/release format. Do not infer compatibility from synthetic signatures alone.

## Verified prerequisites

1. Captured Jade V7 synthetic PSBT: offline QR signature verified and finalized into a legacy P2SH CLTV scriptSig; input was a **fabricated** funding outpoint, so it cannot be spent on regtest. [PSBT workflow #263](https://github.com/bc1q21/bc1q21/actions/runs/38791725328).
2. Bitcoin Core 28 accepted a **software-fixture-signed**, genuinely funded regtest CLTV spend and rejected invalid variants. [Regtest validation workflow #8](https://github.com/bc1q21/bc1q21/actions/runs/38427524114).
3. Stopped real regtest chain snapshot: SHA-256 manifest verified **12 allowlisted chain files**, restarted Core from restore, matched original 102-block tip and confirmed original 0.001 BTC unspent output. [Snapshot workflow #6](https://github.com/bc1q21/bc1q21/actions/runs/38798689829), commit `09556b7`. **This snapshot's output was ordinary P2SH-SegWit, NOT a CLTV output.**

## Stage A — software-only fixture construction (next implementation task)

- Create a **new** ephemeral Bitcoin Core 28 regtest chain, with explicit disposable marker and no external RPC.
- Use **public-only** signer data from a separately verified disposable Jade-derived public key and derivation metadata; if exact public key/origin cannot be established, **STOP**. Do not silently substitute a software key and label the result hardware-ready.
- Build the original retail-compatible legacy P2SH CLTV redeem script and fund **that exact script** with mature regtest-only coins. Confirm funding in a mined regtest block.
- Independently extract and record actual funding `txid`, `vout`, amount in sats, P2SH scriptPubKey, redeem-script SHA-256, funding blockhash/height, locktime, intended output and fee.
- Build a new unsigned PSBT with `Professional/unsigned-cltv-psbt.mjs` and the confirmed funding transaction, preserving non-witness UTXO, redeem script and BIP32 origin fields. Require explicit output and fee comparison. Do not reuse the V7 synthetic signature.
- Export **only public** PSBT/transaction/chain-checkpoint data; reject any wallet database, RPC credential, cookie, WIF, xprv, mnemonic or private key in export. Ensure file names and manifest are allowlisted.

**Stage A exit gate:** A reproducible, verified public-only unsigned PSBT representing an actual confirmed regtest CLTV UTXO. No Jade interaction and no signing.

## Stage B — chain preservation and revalidation (software-only)

- Shut down Core cleanly; export the stopped-chain allowlisted snapshot via `regtest-snapshot-offline.mjs`; verify all SHA-256 hashes and restore to a **new** disposable directory.
- Restart Bitcoin Core on restored chain; require matching original best blockhash and `gettxout(txid,vout)` for the exact confirmed CLTV output, including scriptPubKey, amount and confirmation.
- Validate `regtest-chain-continuity.mjs` checkpoint fields against independently observed Core RPC data. Fail closed on a different chain, wrong outpoint, spent/missing output, script, amount, block hash or height.
- Check unsigned PSBT's input outpoint and nonWitnessUtxo against the restored chain. Keep checkpoint hashes and reproducible logs. No wallet or secret state may enter snapshots.

**Stage B exit gate:** The same funded CLTV output is provably present and unspent after restore. A green snapshot test alone does not satisfy Stage A or Stage B.

## Stage C — separately authorized offline hardware signature (HOLD)

- Request explicit user approval **after** A/B evidence is independently reviewed; until then Jade remains OFF.
- User reviews actual recipient destination, sats, fee and CLTV terms on the hardware display, and signs the exact new funded-regtest unsigned PSBT via air-gapped QR. Never enter or transfer seed words to the website, internet-connected laptop, GitHub or ChatGPT.
- Reassemble signed QR locally, verify transaction invariance, signer pubkey and cryptographic signature. Reject unexpected proprietary/unknown payloads and any private data before storing evidence.

## Stage D — Bitcoin Core consensus acceptance (HOLD)

- Restore and verify the **same** regtest chain/outpoint checkpoint, then finalize the returned signed PSBT.
- Call `testmempoolaccept` on the local disposable regtest Core only; record exact `allowed` and rejection reason. Run locktime, final-sequence, altered-signature, wrong-script and changed-output negatives.
- Local regtest mining/broadcast requires separate authorization; **never** broadcast to public Bitcoin networks.
- Do not claim H-06 PASS until actual Jade-signed redeem-script transaction is accepted and all required multi-release tests pass. H-01/H-03/H-07 and user-experience requirements remain independent gates.

## Current decision

**H-06 PARTIAL; Professional overall NO-GO for real funds and deployment.** The next authorized work is only Stage A/B software preparation and fail-closed tests, not Stage C/D hardware activity.
