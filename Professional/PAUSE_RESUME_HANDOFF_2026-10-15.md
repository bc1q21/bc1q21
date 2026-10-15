# Professional isolated prototype — pause and resume handoff (2026-10-15)

## Boundary — non-negotiable
- Repository: `bc1q21/bc1q21`
- Work ONLY on branch `professional/isolated-release-prototype`, principally under `Professional/` and branch-scoped `.github/workflows/professional-*.yml`.
- NEVER merge, deploy, push, change, or copy Professional work to `main` or the live bc1q21 retail website. Never access/change production server, Start9, DNS, live wallets, keys, or real Bitcoin.
- Jade Plus must remain OFF unless the user explicitly authorizes a future hardware step.
- Professional prototype is NOT approved for real funds. H-06 remains PARTIAL, overall NO-GO. This status refers exclusively to the Professional experiment, NOT to retail operations.
- User prefers ChatGPT directly operate GitHub where possible, minimize screenshots, give one small user step at a time, and provide a clean new-chat handoff.

## Verified earlier evidence
- Jade Plus V7 scanned seven equal-size animated QR parts of a synthetic unsigned 283-byte PSBT, approved 99,000 sats recipient and 1,000 sats fee, and emitted a signed 390-byte PSBT through offline QR. Independent captured-signature ECDSA verification and legacy P2SH CLTV scriptSig finalization passed; no live spend/broadcast.
- GitHub Actions Professional isolated PSBT run #263 green (https://github.com/bc1q21/bc1q21/actions/runs/38791725328), using captured synthetic PSBT.
- Bitcoin Core 28 disposable regtest workflow run #8 green (https://github.com/bc1q21/bc1q21/actions/runs/38427524114): funded P2SH CLTV software-fixture testmempoolaccept, NOT Jade signature.
- Snapshot allowlist and offline export/restore synthetic tests green in Professional isolated PSBT workflow (#279, #283). Only allowlisted regtest chain files, no wallet/cookie/config/keys; SHA-256 manifest integrity.

## Real Bitcoin Core regtest snapshot workflow
File: `.github/workflows/professional-regtest-snapshot-restore.yml`.
Earlier runs:
- #1 https://github.com/bc1q21/bc1q21/actions/runs/38796223751 : directory missing due to container data layout.
- #2 https://github.com/bc1q21/bc1q21/actions/runs/38796561963 : original host volume appeared empty.
- #3 https://github.com/bc1q21/bc1q21/actions/runs/38796902156 : direct bitcoind entrypoint fixed mount but host directory checks lacked permissions.
- #4 https://github.com/bc1q21/bc1q21/actions/runs/38797989185 : diagnostic exposed `Permission denied` descending `regtest/`.
- #5 https://github.com/bc1q21/bc1q21/actions/runs/38798174861 : after `sudo chmod -R a+rX` on stopped disposable regtest directory, **real Bitcoin Core snapshot export, SHA-256 verification and restore PASSED: 12 allowlisted chain files**. Final restored-chain validation failed with exit 1 after Core launch; it assumed funding recipient was always vout 0, which is unreliable due to Bitcoin Core change output.
- Targeted correction committed as `09556b7117e033f10c06cbcf13690f7cfdc9c86f` to this isolated workflow: record actual 0.001 BTC funding address vout from confirmed transaction, record funding blockhash, and validate that precise vout and original chain tip after restore.
- **As of this handoff, outcome of workflow triggered by `09556b7` NOT VERIFIED.** Do not call it passed without checking GitHub Actions. Obtain the new workflow run ID via GitHub Actions (user can paste browser URL if needed), retrieve job summary/logs with GitHub connector.
- If test fails, diagnose exact failing step rather than guessing. Watch for regtest-only behavior or Core JSON response. Do not loosen snapshot allowlist or integrity gate to make a test pass.

## Next steps on return
1. Check workflow run triggered by `09556b7` in GitHub Actions and retrieve exact logs.
2. If successful, document precise evidence, limits and CI URL in `Professional/OFFLINE_SIGNER_EVIDENCE_REGISTER.md`. If failing, make narrow isolated branch correction and rerun.
3. Continue Professional acceptance planning without transferring private seed/key material, connecting live systems or enabling production. H-06 stays partial until Jade real redeem-script signing and consensus acceptance tested in approved isolated process.
4. Keep entire Professional branch isolated; no PR or merge to `main`.

## Scope/meaning of NO-GO
Only means *do not use or ship the Professional prototype with real funds*. Does not mean retail bc1q21 is broken, and does not authorize production deployment. Retail and Professional development remain entirely separate.
