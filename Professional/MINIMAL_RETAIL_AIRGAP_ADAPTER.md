# Minimal hardware-neutral retail adapter boundary

**Scope:** isolated Professional prototype, design contract only. This is **not** an implemented browser integration, signer driver, or authorization to change retail.

## Product invariant
The creator supplies a **pre-existing, independently generated seed** to their own compatible offline wallet. bc1q21 never generates, imports, stores, transports or delivers recovery words. The creator privately delivers both gift card and recovery words to the beneficiary; the beneficiary independently imports them into a compatible offline wallet. All familiar retail gift choices, schedules, gift cards, fee rules, outputs, and release presentation remain unchanged.

## Public online ↔ offline exchange: four minimal operations

| Existing retail location | Offline request and response | Online responsibility |
| --- | --- | --- |
| `CryptoManager.deriveAndStoreKeys` / `generateCltvAddresses` | Import only the wallet's **public** account information, derive/verify retail-compatible funding, change and per-release addresses and CLTV scripts. | Display retail funding and gift details; never ask for mnemonic, WIF, child private key or wallet encryption secret. |
| `bc1q21-h08.js:startDistributionPipeline` | Offline wallet authorizes retail-format first-date encryption **and** signs an unsigned gift distribution transaction, using a mechanism whose compatibility has been independently verified. Return ciphertext and signed transaction only. | Preserve amounts, outputs, change, fee policy, OP_RETURN format and retail broadcast sequence; verify signed transaction matches displayed intent. |
| `gift/gift-h08.js:unlockGift` | Offline environment derives the existing retail OP_RETURN date locally and, after explicit approval, exports only the gift-bound first date and allowed schedule information. | Verify public scripts against the specific gift transaction, then render the unchanged retail gift view. |
| `gift/gift-h08.js:releaseReady` | Offline wallet signs the exact retail-compatible CLTV release transaction or supported PSBT after user confirmation. | Compute fee without unnecessary offline signatures, verify return against destination, amounts, locktime and inputs, then preserve existing broadcast and confirmation UI. |

## Non-negotiable validation gates
- **Hardware neutral:** no vendor-specific protocol in retail code. QR/SD transport and signer drivers are separate adapters; Jade, Coldcard, or another device is eligible only after proving **this exact retail CLTV script**, funding signing, and the schedule-encryption/decryption operation (or a justified minimal offline supplement).
- **Do not mistake xpub for authority:** xpub can construct public scripts but cannot decrypt the first-date ciphertext. A generic PSBT signature also cannot reproduce the existing wallet-derived AES secret.
- **No silent format change:** existing BIP84 paths, per-index CLTV, encrypted OP_RETURN format, fee rules and output ordering are compatibility constraints. New gifts must not silently switch to a different derivation or locktime format.
- **Never put reusable secret in the online request/response.** Offline approval must bind the revealed schedule and signed transaction to the actual gift and intended operation.
- **No platform credential handoff:** gift creator alone transfers recovery words and gift card to beneficiary, out of band.
- **No production assumption:** current prototype is isolated regtest and not yet a multi-release, end-to-end hardware-verified implementation.

## Implementation order (KISS)
1. Map each existing retail call above to a public-only request and verified response. Keep the current UI and business rules.
2. Reuse the already tested public CLTV and PSBT verification components. Do not add a new wallet, seed generator, beneficiary messaging system, or vendor commitment.
3. Test a complete disposable-fixture gift creation and release using retail-format scripts and ciphertext, including multiple releases.
4. Only then select a simple hardware transport that demonstrably supports those operations. If one wallet cannot recover the retail AES schedule, document the limitation rather than pretending a signature solves it.

No retail modifications, real seeds, broadcasts or deployment.
