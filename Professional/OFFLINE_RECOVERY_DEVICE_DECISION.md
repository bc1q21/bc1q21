# Professional offline recovery device decision gate

Status: engineering recommendation only. **No preferred signer or hardware vendor has been selected.** No retail change, no hardware capability assumed.

## Governing KISS rule (user confirmed)
Professional must keep the **same retail gift creation, funding, delivery, unlock and release workflow and behavior**, reusing existing retail code wherever possible. The **only intended functional difference** is that whenever recovery words or private wallet operations are required, they occur through an **air-gapped mechanism** instead of the connected application. Changes to the interface or code are permissible only where technically necessary to enforce that boundary; avoid parallel product logic, new user journeys, or vendor-specific design. The goal is minimum complexity, not maximum hardware features.

**Hardware neutrality:** Jade Plus, Coldcard, or another suitable offline signer are candidates, not product commitments. Prefer a simple, interoperable solution proven to handle the existing retail transaction scripts and encrypted schedules. Separate devices or an offline companion should be a last resort, not the default architecture.

## Fixed requirements
Professional reproduces the retail gift experience. The online gift page never receives BIP39 recovery words, private keys, or wallet-derived reusable AES decryption passphrases. The offline environment must reproduce current retail BC1Q21G1 encrypted OP_RETURN date recovery, authenticate the intended gift and its Bitcoin outputs, and reveal only an explicitly approved schedule. Legacy Salted__ gifts require separate compatibility validation.

## Device options
**Jade Plus (one candidate, not preferred):** Previously exercised for air-gapped PSBT signing and public xpub export. Published QR functions have not established arbitrary child-private-key hashing plus PBKDF2/AES-GCM OP_RETURN decryption. Not approved for schedule recovery without an exact supported and tested implementation.

**Dedicated offline companion (fallback candidate only):** Candidate for schedule recovery using retail-compatible BIP39/BIP32 and AES. It must be permanently isolated, run auditable software, verify the gift context, show a human-readable approval screen, and export a constrained schedule-only QR. Device identity provisioning, tamper resistance, physical controls, and recovery procedures require threat modeling. Not approved or implemented as a product.

**Alter retail ciphertext to match a hardware signature API:** Rejected as a silent compatibility change. Would require a new explicitly versioned gift format and migration strategy, contrary to current retail-parity goal.

## Critical unresolved issues
1. Determine how gift creator and beneficiary each perform seed-related operations without typing recovery words into the online website, including gift creation, gift recovery, and every release.
2. A signed response proves possession of a separately trusted identity key, not correct wallet seed recovery or human consent. A user-visible offline approval and trustworthy enrollment process are mandatory.
3. The online side must independently authenticate the funding transaction and output ordering; matching scripts alone is not evidence of chain confirmation.
4. Clarify whether exposing the recovered schedule to the online recipient page after approval is acceptable; once transferred, the online page can see it.
5. First evaluate whether one vendor-neutral air-gapped mechanism can handle both the retail-compatible encrypted schedule and Bitcoin signing. Only if it cannot, consider a dedicated offline companion. Test with public disposable fixtures, reproducible packaging and dependency integrity before hardware testing.
6. Hardware, threat model, and deployment architecture need explicit approval before changing product behavior.

## Current evidence
The isolated CI now runs the expanded schedule regression suite, including the fixed public BIP39 mnemonic comparison against an independent BIP32 library. Passing software fixtures is not proof of a secure physical air gap.

No main/retail changes, real seed words, real Bitcoin transactions, or broadcasts.

## Creator-to-beneficiary handoff (user-confirmed, non-negotiable)
The gift creator independently creates, safeguards, and delivers the recovery words **and** the normal bc1q21 gift card to the beneficiary, whether personally, through a will or estate, or another private arrangement. **bc1q21 does not generate, hold, escrow, transmit, deliver, recover, or manage those recovery words**, and does not mediate this handoff. The beneficiary later uses those privately received recovery words with their own compatible air-gapped wallet to authorize the ordinary retail-style gift release. This is a user responsibility, **not** an unresolved platform credential-delivery requirement. Keep retail gift-card output and release UX unchanged except for the minimum air-gapped private-operation exchange.
