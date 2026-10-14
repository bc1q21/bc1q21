# Professional offline recovery device decision gate

Status: engineering recommendation only. No device chosen, no retail change, no hardware capability assumed.

## Fixed requirements
Professional reproduces the retail gift experience. The online gift page never receives BIP39 recovery words, private keys, or wallet-derived reusable AES decryption passphrases. The offline environment must reproduce current retail BC1Q21G1 encrypted OP_RETURN date recovery, authenticate the intended gift and its Bitcoin outputs, and reveal only an explicitly approved schedule. Legacy Salted__ gifts require separate compatibility validation.

## Device options
**Jade Plus alone:** Retain for air-gapped PSBT signing and public xpub export. Published QR functions have not established arbitrary child-private-key hashing plus PBKDF2/AES-GCM OP_RETURN decryption. Not approved for schedule recovery without an exact supported and tested implementation.

**Dedicated offline companion:** Candidate for schedule recovery using retail-compatible BIP39/BIP32 and AES. It must be permanently isolated, run auditable software, verify the gift context, show a human-readable approval screen, and export a constrained schedule-only QR. Device identity provisioning, tamper resistance, physical controls, and recovery procedures require threat modeling. Not approved or implemented as a product.

**Alter retail ciphertext to match a hardware signature API:** Rejected as a silent compatibility change. Would require a new explicitly versioned gift format and migration strategy, contrary to current retail-parity goal.

## Critical unresolved issues
1. Determine how gift creator and beneficiary each perform seed-related operations without typing recovery words into the online website, including gift creation, gift recovery, and every release.
2. A signed response proves possession of a separately trusted identity key, not correct wallet seed recovery or human consent. A user-visible offline approval and trustworthy enrollment process are mandatory.
3. The online side must independently authenticate the funding transaction and output ordering; matching scripts alone is not evidence of chain confirmation.
4. Clarify whether exposing the recovered schedule to the online recipient page after approval is acceptable; once transferred, the online page can see it.
5. Build an actual air-gapped offline application, test with public disposable seed fixtures, and inspect reproducible packaging and dependency integrity before any hardware testing.
6. Hardware, threat model, and deployment architecture need explicit approval before changing product behavior.

## Current evidence
The isolated CI now runs the expanded schedule regression suite, including the fixed public BIP39 mnemonic comparison against an independent BIP32 library. Passing software fixtures is not proof of a secure physical air gap.

No main/retail changes, real seed words, real Bitcoin transactions, or broadcasts.
