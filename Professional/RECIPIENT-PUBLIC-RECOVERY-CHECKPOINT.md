# bc1q21 Professional — recipient public-key recovery experiment (decision checkpoint)
Date: 2026-10-17
Scope: professional/isolated-release-prototype exclusively
Status: EXPERIMENTAL / NO-GO FOR DEPLOYMENT

## Evidence
- Professional/test-recipient-public-recovery.mjs and .github/workflows/professional-recipient-public-recovery.yml passed in run 39055843289.
- Disposable synthetic backup entropy derived an X25519 private/public recovery keypair entirely within the test runner.
- The schedule was encrypted to recipient's public key via ephemeral X25519 Diffie–Hellman + HKDF-SHA256 + AES-256-GCM, with envelope metadata as authenticated associated data.
- Tests recovered 1-, 4-, and 24-release schedules, and rejected wrong backups, recipient substitution, altered ciphertext/metadata, unsupported versions and non-regtest context.
- This is a software unit test, not an end-to-end hardware or web UI demonstration, not a cryptographic audit, and not evidence of BIP32 or Jade interoperability.

## Security boundary
- A gift creator may receive recipient's **public** recovery key.
- The corresponding private key and backup must not reach the website, a networked browser, GitHub, ChatGPT, or logging systems.
- Passing an encrypted envelope through an online interface is acceptable only after vetting serialization, integrity and metadata leakage; the browser must never derive or process the recovery private key.
- Published encrypted schedule data can still leak metadata (number of releases, ciphertext length, association with recipient public keys and a specific gift). Decide necessary privacy model before implementation.
- The test's recipient-private-key backup is **independent from the Jade signing wallet**; the test does not demonstrate recovery by restoring a Jade BIP39 wallet. Requiring users to safeguard two different recovery materials introduces substantial UX/operational risk.

## Functional gaps and explicit NO-GO criteria
1. Determine whether Jade offers a device-private X25519 ECDH/decryption API over supported offline QR that never exports derived secrets. Ordinary PSBT signing and BIP85 QR export do NOT demonstrate this.
2. If Jade cannot, evaluate a dedicated offline recovery companion or an alternative hardware device; do not pretend the existing Jade signing seed recovers the separate experimental secret.
3. End-to-end simulate offline creator encryption, public-only relay, recipient recovery and restore on a different clean offline device.
4. Confirm recipient can reconstruct actual CLTV spend destinations and all 24 scheduled releases, not merely read dates; confirm creator/recipient role and required permissions.
5. Design deterministic versioning, metadata minimization, backup handling, binding to actual gift/funding outpoints, wrong-network and malicious metadata tests.
6. Provide recovery and upgrade path for retail BC1Q21G1 and legacy gifts without changing their existing encryption format.
7. No real seeds, keys, funds, production, or retail deployment; require independent security review before any GO.

## Interim recommendation
Keep wallet-signing and recovery-secret problems **separate**. Treat recipient public-key encryption as a viable candidate for the Professional model, but NOT as a solution until the offline key custody and recipient device-loss recovery UX are demonstrated.
