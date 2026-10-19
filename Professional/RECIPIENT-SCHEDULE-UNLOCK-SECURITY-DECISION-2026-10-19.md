# bc1q21 Professional — private recipient schedule unlock security decision (OPEN)

Date: 2026-10-19. Branch: professional/isolated-release-prototype. Scope: isolated regtest engineering only.

## Evidence reviewed
- SESSION-HANDOFF-2026-10-18.md: creator 24-output Jade signing passed; four independent CLTV releases passed; joined lifecycle not accepted.
- synthetic-offline-unlock-pipeline.mjs: decrypts a synthetic retail envelope in an offline companion but explicitly requires a reusable passphrase; NOT suitable for the networked page.
- public-schedule-return.mjs: binds public dates to gift/nonce/output scripts but explicitly does NOT authenticate a device or beneficiary.
- pinned-offline-schedule-response.mjs: verifies a separately pinned Ed25519 companion identity, but does NOT prove possession of original 12-word seed, decryption, or physical approval.
- public-schedule-session-gate.mjs: in-memory single-use challenge; not durable authorization.

## Unresolved mandatory security decision
Retail BC1Q21G1 date metadata uses a secret derived from private BIP32 child m/84'/0'/0'/0/2 and PBKDF2/AES-GCM. A public xpub, QR signature of a release PSBT, or independently pinned companion key cannot demonstrate Jade Plus internally decrypted this exact envelope. No supported Jade QR operation has been established for this.

Do not ship a fake "Unlock with Jade" control. Do not accept client Boolean flags, public gift-link possession, or a signed transaction as authorization to disclose dates. Do not request original 12 words in the browser. Do not export seed, private BIP32 child, AES passphrase, or wallet-wide reusable decryption material from hardware.

## Defensible paths for owner/security review
A. **Prove device-supported cryptographic schedule unlock:** research and verify an actual Jade Plus offline operation that can derive the original retail secret internally and return only a gift-bound, challenge-bound, explicitly approved result. Requires hardware interface evidence and security review; do not assume support.
B. **Versioned Professional metadata redesign:** independently specify a new gift-scoped encryption and recovery design using the *same original 12-word backup*, with proven hardware-supported key derivation and authenticated output. Must address device replacement, loss/recovery, cross-gift isolation, replay, private schedule leakage, and what an offline response exposes to the recipient's online host. Retail stays unchanged. This is a design change requiring explicit owner approval.
C. **Offline companion fallback (not equivalent to Jade unlock):** recipient restores the 12 words on a trusted permanently offline device and authorizes disclosure of one release date or narrowly scoped result. The online browser never sees the words or private derivation. This is a different threat model and requires explicit acceptance before implementing for users.

## Current gate
STOP at authorization. Existing public funding, UTXO, chain-continuity and CLTV maturity checks remain non-authorizing. Do not build a production recipient unlock or claim integrated end-to-end acceptance until one of the above designs is explicitly approved and validated.

No mainnet, real Bitcoin, retail/main edits, production deployment, Start9 changes or repeat Jade signing tests.

## Next investigation: Jade message-signing feasibility

Investigate whether an existing air-gapped Jade message-signing operation can authenticate a gift-bound challenge without exposing the 12-word recovery phrase. Signing a challenge is not equivalent to decrypting the existing encrypted schedule. Keep dates hidden until a separate, validated decryption path exists. Preserve original 12-word recovery, avoid changes to retail, and do not authorize signing or broadcasting from a public gift link. If secure date unlocking proves impractical, return to the owner for an explicit decision on the privacy trade-off rather than making dates public automatically.
